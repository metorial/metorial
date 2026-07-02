import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

export let timeOffEvents = SlateTrigger.create(spec, {
  name: 'Time Off Events',
  key: 'time_off_events',
  description:
    'Triggered when time-off request events occur: created, reviewed (approved/denied), updated, or deleted/cancelled.'
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
      timeOffId: z.string().describe('ID of the affected time-off request'),
      contractId: z.string().optional().describe('ID of the associated contract'),
      workerName: z.string().optional().describe('Name of the worker'),
      status: z.string().optional().describe('Time-off request status'),
      startDate: z.string().optional().describe('Start date of the time off'),
      endDate: z.string().optional().describe('End date of the time off'),
      rawEvent: z.any().describe('Full raw event data from Deel')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let result = await client.createWebhook({
        name: 'Slates Time Off Events',
        description: 'Auto-registered webhook for time-off events',
        url: ctx.input.webhookBaseUrl,
        events: [
          'time_off.created',
          'time_off.reviewed',
          'time_off.updated',
          'time_off.deleted'
        ]
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
      let trackingId = meta.tracking_id ?? data?.id ?? `time_off-${Date.now()}`;
      let eventType = meta.event_type ?? data?.event_type ?? 'time_off.unknown';

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
          timeOffId: resource?.id?.toString() ?? '',
          contractId: resource?.contract_id?.toString(),
          workerName: resource?.worker_name ?? resource?.employee_name,
          status: resource?.status,
          startDate: resource?.start_date,
          endDate: resource?.end_date,
          rawEvent: ctx.input.payload
        }
      };
    }
  })
  .build();
