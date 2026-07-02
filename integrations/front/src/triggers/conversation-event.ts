import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let conversationEvent = SlateTrigger.create(spec, {
  name: 'Conversation Event',
  key: 'conversation_event',
  description:
    '[Polling fallback] Triggers when conversation events occur in Front, including assignments, status changes, messages, tags, comments, and more. Polls the Events API for new activity.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event ID'),
      eventType: z.string().describe('Type of the event (e.g., assign, inbound, archive)'),
      emittedAt: z.number().describe('Timestamp when the event was emitted'),
      conversationId: z.string().optional().describe('ID of the affected conversation'),
      conversationSubject: z
        .string()
        .optional()
        .describe('Subject of the affected conversation'),
      conversationStatus: z.string().optional().describe('Status of the conversation'),
      sourceType: z.string().optional().describe('Source type of the event'),
      targetType: z.string().optional().describe('Target type of the event'),
      targetData: z.any().optional().describe('Target resource data')
    })
  )
  .output(
    z.object({
      conversationId: z.string().optional(),
      conversationSubject: z.string().optional(),
      conversationStatus: z.string().optional(),
      sourceType: z.string().optional(),
      targetType: z.string().optional(),
      emittedAt: z.number()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastEventTimestamp = (ctx.state as any)?.lastEventTimestamp as number | undefined;

      let result = await client.listEvents({
        limit: 50
      });

      let events = result._results;

      // Filter to only new events since last poll
      if (lastEventTimestamp) {
        events = events.filter(e => e.emitted_at > lastEventTimestamp);
      }

      let newTimestamp =
        events.length > 0 ? Math.max(...events.map(e => e.emitted_at)) : lastEventTimestamp;

      return {
        inputs: events.map(e => ({
          eventId: e.id,
          eventType: e.type,
          emittedAt: e.emitted_at,
          conversationId: e.conversation?.id,
          conversationSubject: e.conversation?.subject,
          conversationStatus: e.conversation?.status,
          sourceType: e.source?._meta?.type,
          targetType: e.target?._meta?.type,
          targetData: e.target?.data
        })),
        updatedState: {
          lastEventTimestamp: newTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `conversation.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          conversationId: ctx.input.conversationId,
          conversationSubject: ctx.input.conversationSubject,
          conversationStatus: ctx.input.conversationStatus,
          sourceType: ctx.input.sourceType,
          targetType: ctx.input.targetType,
          emittedAt: ctx.input.emittedAt
        }
      };
    }
  });
