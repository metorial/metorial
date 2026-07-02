import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let threadEventTypes = [
  'thread.thread_created',
  'thread.thread_status_transitioned',
  'thread.thread_assignment_transitioned',
  'thread.thread_labels_changed',
  'thread.thread_priority_changed',
  'thread.service_level_agreement_status_transitioned',
  'thread.thread_field_created',
  'thread.thread_field_updated',
  'thread.thread_field_deleted'
] as const;

export let threadEvents = SlateTrigger.create(spec, {
  name: 'Thread Events',
  key: 'thread_events',
  description:
    'Triggers when thread lifecycle events occur: created, status changed, assigned/unassigned, labels changed, priority changed, SLA status transitioned, or thread fields modified.'
})
  .input(
    z.object({
      eventType: z.string().describe('Webhook event type'),
      eventId: z.string().describe('Unique event ID'),
      timestamp: z.string().describe('Event timestamp (ISO 8601)'),
      workspaceId: z.string().describe('Workspace ID'),
      payload: z.any().describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      threadId: z.string().describe('Plain thread ID'),
      title: z.string().nullable().describe('Thread title'),
      status: z.string().nullable().describe('Thread status'),
      priority: z.number().nullable().describe('Thread priority'),
      customerId: z.string().nullable().describe('Customer ID'),
      previousStatus: z
        .string()
        .nullable()
        .describe('Previous thread status (for transitions)'),
      previousPriority: z
        .number()
        .nullable()
        .describe('Previous thread priority (for changes)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (!threadEventTypes.includes(data.type)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: data.type,
            eventId: data.id,
            timestamp: data.timestamp,
            workspaceId: data.workspaceId,
            payload: data.payload
          }
        ]
      };
    },
    handleEvent: async ctx => {
      let payload = ctx.input.payload;
      let thread = payload?.thread;
      let previousThread = payload?.previousThread;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          threadId: thread?.id ?? '',
          title: thread?.title ?? null,
          status: thread?.status ?? null,
          priority: thread?.priority ?? null,
          customerId: thread?.customer?.id ?? null,
          previousStatus: previousThread?.status ?? null,
          previousPriority: previousThread?.priority ?? null
        }
      };
    }
  })
  .build();
