import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let moveOutEventsTrigger = SlateTrigger.create(spec, {
  name: 'Move-Out & Transfer Events',
  key: 'move_out_events',
  description:
    'Triggers on move-out lifecycle events (created, completed, cancelled) and unit transfer completion.'
})
  .input(
    z.object({
      eventType: z.string().describe('The webhook event type'),
      eventId: z.string().describe('Unique event ID'),
      jobId: z.string().optional().describe('The move-out or transfer job ID'),
      webhookPayload: z.record(z.string(), z.any()).describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('The job ID'),
      eventType: z.string().describe('The type of move-out or transfer event'),
      created: z.string().optional().describe('Timestamp when the event occurred'),
      webhookPayload: z
        .record(z.string(), z.any())
        .describe('Full webhook payload for additional context')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, any>;
      let eventType = (body.type as string) || '';

      let moveOutEventTypes = [
        'job.unit_moveOut.created',
        'job.unit_moveOut.completed',
        'job.unit_moveOut.cancelled',
        'job.unit_transfer.completed'
      ];

      if (!moveOutEventTypes.includes(eventType)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventId: body.id || `${eventType}_${body.created || Date.now()}`,
            jobId: body.data?.jobId || body.data?.id,
            webhookPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          jobId: ctx.input.jobId,
          eventType: ctx.input.eventType,
          created: ctx.input.webhookPayload.created as string | undefined,
          webhookPayload: ctx.input.webhookPayload
        }
      };
    }
  })
  .build();
