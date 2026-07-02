import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let allEventTypes = [
  'response.completed',
  'response.failed',
  'response.cancelled',
  'batch.completed',
  'batch.failed',
  'batch.cancelled',
  'batch.expired',
  'fine_tuning.job.succeeded',
  'fine_tuning.job.failed',
  'fine_tuning.job.cancelled',
  'eval.run.succeeded',
  'eval.run.canceled',
  'realtime.call.incoming'
] as const;

export let openaiEvents = SlateTrigger.create(spec, {
  name: 'OpenAI Events',
  key: 'openai_events',
  description:
    'Receive webhook notifications for OpenAI events including background responses, batch jobs, fine-tuning jobs, evaluation runs, and realtime calls.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of OpenAI event'),
      eventId: z.string().describe('Unique event identifier for deduplication'),
      resourceId: z.string().describe('ID of the affected resource'),
      resourceType: z.string().describe('Type of the affected resource'),
      eventPayload: z.any().describe('Full event payload from OpenAI')
    })
  )
  .output(
    z.object({
      resourceId: z
        .string()
        .describe('ID of the affected resource (response, batch, job, eval run, or call)'),
      resourceType: z
        .string()
        .describe(
          'Type of resource (response, batch, fine_tuning_job, eval_run, realtime_call)'
        ),
      status: z.string().describe('Current status of the resource'),
      metadata: z.any().optional().describe('Additional metadata from the event payload')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        enabledEvents: [...allEventTypes]
      });

      return {
        registrationDetails: {
          webhookId: result.id,
          secret: result.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body.type ?? 'unknown';
      let eventId = body.id ?? `evt_${Date.now()}`;

      let resourceId = '';
      let resourceType = '';

      if (body.data) {
        resourceId = body.data.id ?? '';
        resourceType = body.data.object ?? '';
      }

      return {
        inputs: [
          {
            eventType,
            eventId,
            resourceId,
            resourceType,
            eventPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, eventId, resourceId, resourceType, eventPayload } = ctx.input;

      let status = 'unknown';
      if (eventPayload?.data?.status) {
        status = eventPayload.data.status;
      } else {
        let parts = eventType.split('.');
        status = parts[parts.length - 1] ?? 'unknown';
      }

      return {
        type: eventType,
        id: eventId,
        output: {
          resourceId,
          resourceType,
          status,
          metadata: eventPayload?.data ?? undefined
        }
      };
    }
  })
  .build();
