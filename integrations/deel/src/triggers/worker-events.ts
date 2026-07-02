import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

export let workerEvents = SlateTrigger.create(spec, {
  name: 'Worker Events',
  key: 'worker_events',
  description:
    'Triggered when worker/people events occur: created, updated, or deleted. Includes events for direct employees, contractors, and EOR employees.'
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
      workerId: z.string().describe('ID of the affected worker'),
      workerName: z.string().optional().describe('Full name of the worker'),
      workerEmail: z.string().optional().describe('Email of the worker'),
      hiringType: z
        .string()
        .optional()
        .describe('Hiring type (contractor, employee, eor_employee)'),
      rawEvent: z.any().describe('Full raw event data from Deel')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let result = await client.createWebhook({
        name: 'Slates Worker Events',
        description: 'Auto-registered webhook for worker events',
        url: ctx.input.webhookBaseUrl,
        events: [
          'worker.created',
          'worker.updated',
          'worker.deleted',
          'direct_employee.created',
          'contractor.created',
          'eor_employee.created'
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
      let _resource = data?.data?.resource ?? data?.resource ?? {};

      let eventType = meta.event_type ?? data?.event_type ?? 'worker.unknown';
      let trackingId = meta.tracking_id ?? data?.id ?? `${eventType}-${Date.now()}`;

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
          workerId: resource?.id?.toString() ?? '',
          workerName:
            resource?.full_name ??
            resource?.name ??
            [resource?.first_name, resource?.last_name].filter(Boolean).join(' '),
          workerEmail: resource?.email ?? resource?.work_email,
          hiringType: resource?.hiring_type ?? resource?.type,
          rawEvent: ctx.input.payload
        }
      };
    }
  })
  .build();
