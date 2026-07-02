import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let taskRunEvents = SlateTrigger.create(spec, {
  name: 'Task Run Events',
  key: 'task_run_events',
  description:
    'Triggered when a Parallel deep research task run changes status (completes or fails). Configure the webhook URL when creating a task run using the Deep Research tool.'
})
  .input(
    z.object({
      eventType: z.string().describe('Webhook event type (task_run.status)'),
      runId: z.string().describe('Task run ID'),
      status: z.string().describe('New status of the task run'),
      timestamp: z.string().describe('Event timestamp'),
      webhookId: z.string().describe('Webhook event ID for deduplication')
    })
  )
  .output(
    z.object({
      runId: z.string().describe('Task run ID'),
      status: z.string().describe('Task run status (completed, failed)'),
      timestamp: z.string().describe('Event timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, any>;

      let eventType = body.type ?? 'task_run.status';
      let data = body.data ?? {};
      let runId = data.run_id ?? '';
      let status = data.status ?? '';
      let timestamp = body.timestamp ?? new Date().toISOString();
      let webhookId =
        ctx.request.headers.get('webhook-id') ?? `${runId}_${status}_${timestamp}`;

      return {
        inputs: [
          {
            eventType,
            runId,
            status,
            timestamp,
            webhookId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.webhookId,
        output: {
          runId: ctx.input.runId,
          status: ctx.input.status,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
