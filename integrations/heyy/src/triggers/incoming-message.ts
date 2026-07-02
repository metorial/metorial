import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let incomingMessageTrigger = SlateTrigger.create(spec, {
  name: 'Incoming Message',
  key: 'incoming_message',
  description:
    'Triggers when a new incoming message is received from a customer through any connected channel (WhatsApp, Instagram, Messenger, or web chat).'
})
  .input(
    z.object({
      webhookEventId: z.string().describe('Unique webhook event ID'),
      event: z.string().describe('Event type from the webhook payload'),
      message: z
        .object({
          messageId: z.string().describe('Message ID'),
          chatId: z.string().optional().describe('Chat ID'),
          channelId: z.string().optional().describe('Channel ID'),
          vendorId: z.string().optional().describe('Vendor-specific message ID'),
          sender: z.string().optional().describe('Sender identifier'),
          status: z.string().optional().describe('Message status'),
          body: z.string().optional().describe('Message body text'),
          attachments: z.array(z.any()).optional().describe('Message attachments'),
          forwarded: z.boolean().optional().describe('Whether the message was forwarded'),
          isSensitive: z
            .boolean()
            .optional()
            .describe('Whether the message is flagged as sensitive'),
          timestamp: z.string().optional().describe('Message timestamp'),
          createdAt: z.string().optional().describe('When the message was created')
        })
        .describe('Message data')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique message identifier'),
      chatId: z.string().optional().describe('Chat conversation ID'),
      channelId: z.string().optional().describe('Channel the message was received on'),
      sender: z
        .string()
        .optional()
        .describe('Sender identifier (phone number, username, etc.)'),
      body: z.string().optional().describe('Message body text'),
      attachments: z.array(z.any()).optional().describe('Message attachments'),
      status: z.string().optional().describe('Message delivery status'),
      forwarded: z.boolean().optional().describe('Whether the message was forwarded'),
      isSensitive: z
        .boolean()
        .optional()
        .describe('Whether the message is flagged as sensitive'),
      timestamp: z.string().optional().describe('When the message was sent'),
      createdAt: z.string().optional().describe('When the message was created')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      // First get the business to use as tenantId
      let business = await client.getBusiness();

      let webhook = await client.createWebhook({
        tenantId: business.id,
        type: 'WHATSAPP_MESSAGE_RECEIVED',
        url: ctx.input.webhookBaseUrl
      });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          tenantId: business.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let message = data?.message ?? {};

      return {
        inputs: [
          {
            webhookEventId: data?.id ?? '',
            event: data?.event ?? 'message_inbound',
            message: {
              messageId: message.id ?? '',
              chatId: message.chatId,
              channelId: message.channelId,
              vendorId: message.vendorId,
              sender: message.sender,
              status: message.status,
              body: message.content?.body,
              attachments: message.content?.attachments ?? [],
              forwarded: message.forwarded,
              isSensitive: message.isSensitive,
              timestamp: message.timestamp,
              createdAt: message.createdAt
            }
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let msg = ctx.input.message;

      return {
        type: `message.${ctx.input.event}`,
        id: ctx.input.webhookEventId,
        output: {
          messageId: msg.messageId,
          chatId: msg.chatId,
          channelId: msg.channelId,
          sender: msg.sender,
          body: msg.body,
          attachments: msg.attachments,
          status: msg.status,
          forwarded: msg.forwarded,
          isSensitive: msg.isSensitive,
          timestamp: msg.timestamp,
          createdAt: msg.createdAt
        }
      };
    }
  })
  .build();
