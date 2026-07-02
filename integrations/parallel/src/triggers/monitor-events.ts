import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let monitorEvents = SlateTrigger.create(spec, {
  name: 'Monitor Events',
  key: 'monitor_events',
  description:
    'Triggered when a Parallel web monitor detects new events, completes an execution, or fails. Configure the webhook URL when creating a monitor using the Create Monitor tool.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Webhook event type (monitor.event.detected, monitor.execution.completed, monitor.execution.failed)'
        ),
      monitorId: z.string().describe('Monitor ID that triggered the event'),
      eventGroupId: z.string().nullable().describe('Event group ID (for detected events)'),
      timestamp: z.string().describe('Event timestamp'),
      metadata: z.record(z.string(), z.unknown()).nullable().describe('Monitor metadata'),
      webhookId: z.string().describe('Webhook event ID for deduplication')
    })
  )
  .output(
    z.object({
      monitorId: z.string().describe('Monitor ID'),
      eventGroupId: z
        .string()
        .nullable()
        .describe('Event group ID for retrieving detected events'),
      timestamp: z.string().describe('Event timestamp'),
      metadata: z.record(z.string(), z.unknown()).nullable().describe('Monitor metadata')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, any>;

      let eventType = body.type ?? 'unknown';
      let data = body.data ?? {};
      let monitorId = data.monitor_id ?? '';
      let eventGroupId = data.event?.event_group_id ?? null;
      let timestamp = body.timestamp ?? new Date().toISOString();
      let metadata = data.metadata ?? null;
      let webhookId =
        ctx.request.headers.get('webhook-id') ?? `${monitorId}_${eventType}_${timestamp}`;

      return {
        inputs: [
          {
            eventType,
            monitorId,
            eventGroupId,
            timestamp,
            metadata,
            webhookId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, monitorId, eventGroupId, timestamp, metadata, webhookId } = ctx.input;

      return {
        type: eventType,
        id: webhookId,
        output: {
          monitorId,
          eventGroupId,
          timestamp,
          metadata
        }
      };
    }
  })
  .build();
