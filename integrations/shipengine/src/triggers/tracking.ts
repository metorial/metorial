import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let trackingEventSchema = z.object({
  occurredAt: z.string().describe('When the event occurred'),
  description: z.string().describe('Event description'),
  cityLocality: z.string().optional().describe('City where event occurred'),
  stateProvince: z.string().optional().describe('State/province'),
  postalCode: z.string().optional().describe('Postal code'),
  countryCode: z.string().optional().describe('Country code'),
  companyName: z.string().optional().describe('Facility name'),
  signer: z.string().optional().describe('Signer name'),
  statusCode: z.string().optional().describe('Status code'),
  statusDescription: z.string().optional().describe('Status description')
});

export let trackingTrigger = SlateTrigger.create(spec, {
  name: 'Tracking Update',
  key: 'tracking_update',
  description:
    'Fires when a tracking status changes for a package (e.g., accepted, in transit, delivered, exception).'
})
  .input(
    z.object({
      resourceUrl: z.string().optional().describe('URL to the tracking resource'),
      trackingNumber: z.string().describe('Tracking number'),
      statusCode: z.string().describe('Current status code'),
      carrierStatusCode: z.string().optional().describe('Carrier-specific status code'),
      statusDescription: z.string().optional().describe('Status description'),
      carrierCode: z.string().optional().describe('Carrier code'),
      estimatedDeliveryDate: z.string().optional().describe('Estimated delivery date'),
      actualDeliveryDate: z.string().optional().describe('Actual delivery date'),
      events: z.array(z.any()).optional().describe('Raw tracking events')
    })
  )
  .output(
    z.object({
      trackingNumber: z.string().describe('Tracking number'),
      statusCode: z.string().describe('Current status code (e.g., AC, IT, DE, EX, UN, AT)'),
      statusDescription: z.string().describe('Human-readable status description'),
      carrierCode: z.string().optional().describe('Carrier code'),
      carrierStatusCode: z.string().optional().describe('Carrier-specific status code'),
      estimatedDeliveryDate: z.string().optional().describe('Estimated delivery date'),
      actualDeliveryDate: z.string().optional().describe('Actual delivery date'),
      events: z.array(trackingEventSchema).describe('Tracking event history')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let webhook = await client.createWebhook({
        event: 'track',
        url: ctx.input.webhookBaseUrl
      });

      return {
        registrationDetails: {
          webhookId: webhook.webhook_id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let trackingNumber = data?.data?.tracking_number ?? data?.tracking_number ?? '';
      let statusCode = data?.data?.status_code ?? data?.status_code ?? '';

      return {
        inputs: [
          {
            resourceUrl: data?.resource_url ?? '',
            trackingNumber,
            statusCode,
            carrierStatusCode: data?.data?.carrier_status_code,
            statusDescription: data?.data?.status_description ?? data?.status_description,
            carrierCode: data?.data?.carrier_code,
            estimatedDeliveryDate: data?.data?.estimated_delivery_date,
            actualDeliveryDate: data?.data?.actual_delivery_date,
            events: data?.data?.events ?? []
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let events = (ctx.input.events || []).map((e: any) => ({
        occurredAt: e.occurred_at ?? '',
        description: e.description ?? '',
        cityLocality: e.city_locality,
        stateProvince: e.state_province,
        postalCode: e.postal_code,
        countryCode: e.country_code,
        companyName: e.company_name,
        signer: e.signer,
        statusCode: e.status_code,
        statusDescription: e.status_description
      }));

      return {
        type: `tracking.${ctx.input.statusCode.toLowerCase() || 'updated'}`,
        id: `${ctx.input.trackingNumber}-${ctx.input.statusCode}-${Date.now()}`,
        output: {
          trackingNumber: ctx.input.trackingNumber,
          statusCode: ctx.input.statusCode,
          statusDescription: ctx.input.statusDescription ?? '',
          carrierCode: ctx.input.carrierCode,
          carrierStatusCode: ctx.input.carrierStatusCode,
          estimatedDeliveryDate: ctx.input.estimatedDeliveryDate,
          actualDeliveryDate: ctx.input.actualDeliveryDate,
          events
        }
      };
    }
  })
  .build();
