import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { spec } from '../spec';

let BEACON_EVENTS = ['beacon.chat.created', 'beacon.chat.customer.replied'] as const;

export let beaconChatEvents = SlateTrigger.create(spec, {
  name: 'Beacon Chat Events',
  key: 'beacon_chat_events',
  description:
    'Triggered when Beacon live chats are created or customers send messages in a chat.'
})
  .input(
    z.object({
      eventType: z.string().describe('Help Scout event type'),
      chatId: z.number().describe('Chat/conversation ID'),
      customerEmail: z.string().nullable().describe('Customer email'),
      message: z.string().nullable().describe('Chat message'),
      webhookId: z.string().describe('Webhook delivery identifier')
    })
  )
  .output(
    z.object({
      chatId: z.number().describe('Chat/conversation ID'),
      customerEmail: z.string().nullable().describe('Customer email'),
      message: z.string().nullable().describe('Chat message')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new HelpScoutClient(ctx.auth.token);
      let secret = crypto.randomUUID();
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events: [...BEACON_EVENTS],
        secret,
        payloadVersion: 'V2'
      });

      return {
        registrationDetails: {
          webhookId: result.webhookId,
          secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new HelpScoutClient(ctx.auth.token);
      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        await client.deleteWebhook(Number(webhookId));
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as any;
      let eventType = data?.event ?? data?.eventType ?? '';
      let chat = data?.payload?.conversation ?? data?.conversation ?? data ?? {};
      let thread = data?.payload?.thread ?? data?.thread ?? null;

      let chatId = chat.id ?? 0;
      let customerEmail = chat.primaryCustomer?.email ?? chat.customer?.email ?? null;
      let message = thread?.body ?? null;

      let webhookId = `${eventType}-${chatId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            chatId,
            customerEmail,
            message,
            webhookId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        'beacon.chat.created': 'beacon_chat.created',
        'beacon.chat.customer.replied': 'beacon_chat.customer_replied'
      };

      return {
        type: typeMap[ctx.input.eventType] ?? `beacon_chat.${ctx.input.eventType}`,
        id: ctx.input.webhookId,
        output: {
          chatId: ctx.input.chatId,
          customerEmail: ctx.input.customerEmail,
          message: ctx.input.message
        }
      };
    }
  })
  .build();
