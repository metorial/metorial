import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { spec } from '../spec';

let trackingEventSchema = z.object({
  status: z.string().optional(),
  statusDetails: z.string().optional(),
  statusDate: z.string().optional(),
  location: z
    .object({
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      country: z.string().optional()
    })
    .optional()
});

export let trackingUpdated = SlateTrigger.create(spec, {
  name: 'Tracking Updated',
  key: 'tracking_updated',
  description:
    'Triggered when a shipment tracking status changes. Provides the full tracking object including current status, history, and ETA.'
})
  .input(
    z.object({
      trackingNumber: z.string().describe('Carrier tracking number'),
      carrier: z.string().describe('Carrier token'),
      currentStatus: z.string().optional().describe('Current tracking status'),
      trackingPayload: z.any().describe('Full tracking object from Shippo')
    })
  )
  .output(
    z.object({
      trackingNumber: z.string().optional(),
      carrier: z.string().optional(),
      currentStatus: z
        .string()
        .optional()
        .describe(
          'Current status: PRE_TRANSIT, TRANSIT, DELIVERED, RETURNED, FAILURE, UNKNOWN'
        ),
      statusDetails: z.string().optional(),
      statusDate: z.string().optional(),
      eta: z.string().optional(),
      servicelevel: z.string().optional(),
      addressFrom: z.any().optional(),
      addressTo: z.any().optional(),
      trackingHistory: z.array(trackingEventSchema).optional(),
      metadata: z.string().optional(),
      transactionId: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ShippoClient(ctx.auth.token);

      let webhook = (await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        event: 'track_updated',
        is_test: false
      })) as Record<string, any>;

      return {
        registrationDetails: {
          webhookId: webhook.object_id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ShippoClient(ctx.auth.token);
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      return {
        inputs: [
          {
            trackingNumber: data.tracking_number,
            carrier: data.carrier,
            currentStatus: data.tracking_status?.status,
            trackingPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.trackingPayload as Record<string, any>;

      let mapEvent = (event: any) => ({
        status: event?.status,
        statusDetails: event?.status_details,
        statusDate: event?.status_date,
        location: event?.location
          ? {
              city: event.location.city,
              state: event.location.state,
              zip: event.location.zip,
              country: event.location.country
            }
          : undefined
      });

      return {
        type: 'tracking.updated',
        id: `${ctx.input.trackingNumber}-${payload.tracking_status?.status_date || Date.now()}`,
        output: {
          trackingNumber: payload.tracking_number,
          carrier: payload.carrier,
          currentStatus: payload.tracking_status?.status,
          statusDetails: payload.tracking_status?.status_details,
          statusDate: payload.tracking_status?.status_date,
          eta: payload.eta,
          servicelevel: payload.servicelevel?.name,
          addressFrom: payload.address_from,
          addressTo: payload.address_to,
          trackingHistory: (payload.tracking_history || []).map(mapEvent),
          metadata: payload.metadata,
          transactionId: payload.transaction
        }
      };
    }
  })
  .build();
