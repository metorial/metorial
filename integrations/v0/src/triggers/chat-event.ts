import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { V0Client } from '../lib/client';
import { spec } from '../spec';

export let chatEventTrigger = SlateTrigger.create(spec, {
  name: 'Chat Event',
  key: 'chat_event',
  description:
    'Triggers when a chat or message event occurs, such as chat creation, updates, deletions, and message lifecycle events.'
})
  .input(
    z.object({
      eventType: z.string().describe('The event type (e.g., chat.created, message.finished)'),
      eventId: z.string().describe('Unique event identifier for deduplication'),
      chatId: z.string().optional().describe('Chat ID associated with the event'),
      payload: z.any().describe('Raw event payload from V0')
    })
  )
  .output(
    z.object({
      chatId: z.string().optional().describe('Chat identifier'),
      name: z.string().optional().describe('Chat name'),
      privacy: z.string().optional().describe('Chat privacy setting'),
      projectId: z.string().optional().describe('Associated project ID'),
      webUrl: z.string().optional().describe('Web URL for the chat'),
      messageRole: z.string().optional().describe('Message role (for message events)'),
      messageContent: z.string().optional().describe('Message content (for message events)'),
      rawPayload: z.any().describe('Full raw event payload')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new V0Client(ctx.auth.token);

      let hook = await client.createHook({
        name: 'Slates Chat Event Trigger',
        events: [
          'chat.created',
          'chat.updated',
          'chat.deleted',
          'message.created',
          'message.updated',
          'message.deleted',
          'message.finished'
        ],
        url: ctx.input.webhookBaseUrl
      });

      return {
        registrationDetails: {
          hookId: hook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new V0Client(ctx.auth.token);
      await client.deleteHook(ctx.input.registrationDetails.hookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let eventType = data.type || data.event || 'unknown';
      let eventId = data.id || `${eventType}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            chatId: data.chatId || data.chat?.id,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.payload;
      let chat = payload.chat || payload;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          chatId: ctx.input.chatId || chat.id,
          name: chat.name,
          privacy: chat.privacy,
          projectId: chat.projectId,
          webUrl: chat.webUrl,
          messageRole: payload.message?.role,
          messageContent: payload.message?.content,
          rawPayload: payload
        }
      };
    }
  })
  .build();
