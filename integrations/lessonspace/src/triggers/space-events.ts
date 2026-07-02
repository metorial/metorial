import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let spaceEvents = SlateTrigger.create(spec, {
  name: 'Space Events',
  key: 'space_events',
  description:
    'Listens for real-time events from Lessonspace spaces including session lifecycle, user activity, chat messages, co-browsing, transcription completion, and summary completion.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The type of webhook event (e.g., session.start, user.join).'),
      webhookId: z.string().describe('Unique webhook delivery ID.'),
      timestamp: z.string().describe('ISO 8601 timestamp of when the event occurred.'),
      eventPayload: z.any().describe('Raw event payload from Lessonspace.')
    })
  )
  .output(
    z.object({
      webhookEvent: z
        .string()
        .describe(
          'The webhook event type header (e.g., session.start, user.join, chat.message).'
        ),
      webhookId: z.string().describe('Unique identifier for this webhook delivery.'),
      timestamp: z.string().describe('ISO 8601 timestamp of when the event occurred.'),
      sessionId: z
        .string()
        .optional()
        .describe('Session ID associated with the event, if available.'),
      roomId: z
        .string()
        .optional()
        .describe('Space/room ID associated with the event, if available.'),
      userId: z
        .string()
        .optional()
        .describe('User ID associated with the event, if applicable.'),
      userName: z
        .string()
        .optional()
        .describe('User name associated with the event, if applicable.'),
      isGuest: z.boolean().optional().describe('Whether the user is a guest, if applicable.'),
      messageContent: z
        .string()
        .optional()
        .describe('Chat message content, if this is a chat.message event.'),
      rawPayload: z.any().describe('The complete raw webhook payload.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = await ctx.request.json();
      let eventType = ctx.request.headers.get('x-webhook-event') || 'unknown';
      let webhookId = ctx.request.headers.get('x-webhook-id') || '';
      let timestamp =
        ctx.request.headers.get('x-webhook-timestamp') || new Date().toISOString();

      return {
        inputs: [
          {
            eventType,
            webhookId,
            timestamp,
            eventPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.eventPayload || {};

      let sessionId = payload.session?.id?.toString() || payload.id?.toString() || undefined;
      let roomId = payload.room?.id?.toString() || undefined;
      let userId = payload.user?.id?.toString() || undefined;
      let userName = payload.user?.name || undefined;
      let isGuest = payload.user?.guest;
      let messageContent = payload.message || payload.content || undefined;

      return {
        type: ctx.input.eventType || 'space.event',
        id: ctx.input.webhookId || `${ctx.input.eventType}-${ctx.input.timestamp}`,
        output: {
          webhookEvent: ctx.input.eventType,
          webhookId: ctx.input.webhookId,
          timestamp: ctx.input.timestamp,
          sessionId,
          roomId,
          userId,
          userName,
          isGuest: typeof isGuest === 'boolean' ? isGuest : undefined,
          messageContent: typeof messageContent === 'string' ? messageContent : undefined,
          rawPayload: payload
        }
      };
    }
  })
  .build();
