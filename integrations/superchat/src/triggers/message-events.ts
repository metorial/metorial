import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { SuperchatClient } from '../lib/client';
import { spec } from '../spec';

let messageEventTypes = ['message_inbound', 'message_outbound', 'message_failed'] as const;

export let messageEvents = SlateTrigger.create(spec, {
  name: 'Message Events',
  key: 'message_events',
  description:
    'Triggered when messages are received, sent, or fail to deliver across any connected channel.'
})
  .input(
    z.object({
      eventType: z.enum(messageEventTypes).describe('Type of message event'),
      eventId: z.string().describe('Unique event identifier'),
      messageId: z.string().describe('Message ID'),
      messageUrl: z.string().optional().describe('Message resource URL'),
      createdAt: z.string().optional().describe('Message creation timestamp'),
      updatedAt: z.string().optional().describe('Message last update timestamp'),
      status: z.string().optional().describe('Message delivery status'),
      direction: z.string().optional().describe('Message direction (inbound or outbound)'),
      contentType: z
        .string()
        .optional()
        .describe('Content type (text, email, whats_app_template, etc.)'),
      contentBody: z.string().optional().describe('Message text content'),
      channelId: z.string().optional().describe('Channel ID the message was sent/received on'),
      channelType: z.string().optional().describe('Channel type (whatsapp, email, sms, etc.)'),
      contactId: z.string().optional().describe('Contact ID associated with the message'),
      conversationId: z.string().optional().describe('Conversation ID'),
      errors: z
        .array(
          z.object({
            title: z.string().optional(),
            type: z.string().optional()
          })
        )
        .optional()
        .describe('Error details for failed messages')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Message ID'),
      messageUrl: z.string().optional().describe('Message resource URL'),
      createdAt: z.string().optional().describe('Message creation timestamp'),
      status: z.string().optional().describe('Message delivery status'),
      direction: z.string().optional().describe('Message direction'),
      contentType: z.string().optional().describe('Content type'),
      contentBody: z.string().optional().describe('Message text content'),
      channelId: z.string().optional().describe('Channel ID'),
      channelType: z.string().optional().describe('Channel type'),
      contactId: z.string().optional().describe('Contact ID'),
      conversationId: z.string().optional().describe('Conversation ID'),
      errors: z
        .array(
          z.object({
            title: z.string().optional(),
            type: z.string().optional()
          })
        )
        .optional()
        .describe('Error details for failed messages')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new SuperchatClient({ token: ctx.auth.token });

      let webhook = await client.createWebhook(ctx.input.webhookBaseUrl, [
        { type: 'message_inbound' },
        { type: 'message_outbound' },
        { type: 'message_failed' }
      ]);

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new SuperchatClient({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let message = data.message || data.payload?.message || {};
      let contact = message.to?.[0] || message.from || {};

      return {
        inputs: [
          {
            eventType: data.event,
            eventId: data.id,
            messageId: message.id || data.id,
            messageUrl: message.url,
            createdAt: message.created_at,
            updatedAt: message.updated_at,
            status: message.status,
            direction: message.direction,
            contentType: message.content?.type,
            contentBody: message.content?.body,
            channelId: message.from?.channel_id || message.channel?.id,
            channelType: message.from?.type || message.channel?.type,
            contactId: contact.contact_id || contact.id,
            conversationId: message.conversation_id,
            errors: message.errors
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          messageId: ctx.input.messageId,
          messageUrl: ctx.input.messageUrl,
          createdAt: ctx.input.createdAt,
          status: ctx.input.status,
          direction: ctx.input.direction,
          contentType: ctx.input.contentType,
          contentBody: ctx.input.contentBody,
          channelId: ctx.input.channelId,
          channelType: ctx.input.channelType,
          contactId: ctx.input.contactId,
          conversationId: ctx.input.conversationId,
          errors: ctx.input.errors
        }
      };
    }
  })
  .build();
