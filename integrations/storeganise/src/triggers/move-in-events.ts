import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let moveInEventsTrigger = SlateTrigger.create(spec, {
  name: 'Move-In Events',
  key: 'move_in_events',
  description:
    'Triggers on self-storage move-in lifecycle events: order initiation, submission, confirmation, completion, and cancellation.'
})
  .input(
    z.object({
      eventType: z.string().describe('The webhook event type'),
      eventId: z.string().describe('Unique event ID'),
      jobId: z.string().optional().describe('The move-in job ID'),
      webhookPayload: z.record(z.string(), z.any()).describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('The move-in job ID'),
      eventType: z.string().describe('The type of move-in event'),
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

      let moveInEventTypes = [
        'job.unit_moveIn.create.started',
        'job.unit_moveIn.created',
        'job.unit_moveIn.started',
        'job.unit_moveIn.completed',
        'job.unit_moveIn.cancelled'
      ];

      if (!moveInEventTypes.includes(eventType)) {
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
