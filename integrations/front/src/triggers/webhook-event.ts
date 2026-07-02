import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let webhookEvent = SlateTrigger.create(spec, {
  name: 'Webhook Event',
  key: 'webhook_event',
  description:
    'Receives real-time webhook events from Front. Supports all Front event types including messages, assignments, tags, comments, and conversation lifecycle changes. Requires manual webhook configuration in Front (via app webhook feature or rule webhook).'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event ID'),
      eventType: z.string().describe('Type of the event'),
      emittedAt: z.number().describe('Timestamp when the event was emitted'),
      conversationId: z.string().optional().describe('Conversation ID'),
      conversationSubject: z.string().optional().describe('Conversation subject'),
      conversationStatus: z.string().optional().describe('Conversation status'),
      sourceType: z.string().optional().describe('Source type'),
      targetType: z.string().optional().describe('Target type'),
      companyId: z.string().optional().describe('Company ID from authorization object')
    })
  )
  .output(
    z.object({
      conversationId: z.string().optional(),
      conversationSubject: z.string().optional(),
      conversationStatus: z.string().optional(),
      sourceType: z.string().optional(),
      targetType: z.string().optional(),
      companyId: z.string().optional(),
      emittedAt: z.number()
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // Front webhook payloads can be either a full event or event preview
      // Full event: { type, payload: { ... } }
      // The payload structure varies but always includes type and conversation
      let eventType = body.type || body.payload?.type;
      let payload = body.payload || body;

      if (!eventType) {
        return { inputs: [] };
      }

      let conversation = payload.conversation || {};
      let source = payload.source || {};
      let target = payload.target || {};

      return {
        inputs: [
          {
            eventId: payload.id || `${eventType}_${Date.now()}`,
            eventType: eventType,
            emittedAt: payload.emitted_at || Math.floor(Date.now() / 1000),
            conversationId: conversation.id,
            conversationSubject: conversation.subject,
            conversationStatus: conversation.status,
            sourceType: source._meta?.type,
            targetType: target._meta?.type,
            companyId: body.authorization?.id
          }
        ]
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
          companyId: ctx.input.companyId,
          emittedAt: ctx.input.emittedAt
        }
      };
    }
  });
