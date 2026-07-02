import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

export let timesheetEvents = SlateTrigger.create(spec, {
  name: 'Timesheet Events',
  key: 'timesheet_events',
  description: 'Triggered when timesheet events occur: created or reviewed (approved/denied).'
})
  .input(
    z.object({
      eventType: z.string().describe('The webhook event type identifier'),
      eventId: z.string().describe('Unique identifier for this event'),
      payload: z.any().describe('Full event payload from Deel')
    })
  )
  .output(
    z.object({
      timesheetId: z.string().describe('ID of the affected timesheet'),
      contractId: z.string().optional().describe('ID of the associated contract'),
      status: z.string().optional().describe('Timesheet review status'),
      quantity: z.number().optional().describe('Hours or units in the timesheet'),
      rawEvent: z.any().describe('Full raw event data from Deel')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let result = await client.createWebhook({
        name: 'Slates Timesheet Events',
        description: 'Auto-registered webhook for timesheet events',
        url: ctx.input.webhookBaseUrl,
        events: ['timesheet.created', 'timesheet.reviewed']
      });

      let webhookData = result?.data ?? result;

      return {
        registrationDetails: {
          webhookId: webhookData?.id ?? webhookData?.webhook_id,
          secret: webhookData?.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        await client.deleteWebhook(webhookId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let meta = data?.data?.meta ?? data?.meta ?? {};
      let trackingId = meta.tracking_id ?? data?.id ?? `timesheet-${Date.now()}`;
      let eventType = meta.event_type ?? data?.event_type ?? 'timesheet.unknown';

      return {
        inputs: [
          {
            eventType,
            eventId: trackingId,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let resource = ctx.input.payload?.data?.resource ?? ctx.input.payload?.resource ?? {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          timesheetId: resource?.id?.toString() ?? '',
          contractId: resource?.contract_id?.toString(),
          status: resource?.status,
          quantity: resource?.quantity != null ? Number(resource.quantity) : undefined,
          rawEvent: ctx.input.payload
        }
      };
    }
  })
  .build();
