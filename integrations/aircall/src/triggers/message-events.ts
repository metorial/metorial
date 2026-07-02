import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let messageEventTypes = [
  'message.sent',
  'message.received',
  'message.status_updated'
] as const;

export let messageEvents = SlateTrigger.create(spec, {
  name: 'Message Events',
  key: 'message_events',
  description:
    'Triggers when messaging events occur including sent, received, and status updates (delivery confirmations, read receipts). This is the only way to track messages — historical messages cannot be fetched via the API.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of message event'),
      timestamp: z.number().describe('Event timestamp as UNIX timestamp'),
      webhookToken: z.string().describe('Webhook verification token'),
      message: z.any().describe('The message data from the event payload')
    })
  )
  .output(
    z.object({
      messageId: z.any().describe('Unique message identifier'),
      direction: z.string().nullable().describe('Message direction (inbound or outbound)'),
      status: z.string().nullable().describe('Message status'),
      from: z.string().nullable().describe('Sender phone number'),
      to: z.string().nullable().describe('Recipient phone number'),
      content: z.string().nullable().describe('Message content'),
      numberId: z.number().nullable().describe('Aircall number ID'),
      contactId: z.number().nullable().describe('Associated contact ID')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client(ctx.auth);
      let webhook = await client.createWebhook(
        ctx.input.webhookBaseUrl,
        [...messageEventTypes],
        'slates-message-events'
      );
      return {
        registrationDetails: {
          webhookId: webhook.webhook_id,
          token: webhook.token
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client(ctx.auth);
      let details = ctx.input.registrationDetails as { webhookId: number };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (data.resource !== 'message') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: data.event,
            timestamp: data.timestamp,
            webhookToken: data.token || '',
            message: data.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let msg = ctx.input.message;

      return {
        type: ctx.input.eventType,
        id: `${msg.id || ctx.input.timestamp}-${ctx.input.eventType}-${ctx.input.timestamp}`,
        output: {
          messageId: msg.id ?? null,
          direction: msg.direction ?? null,
          status: msg.status ?? null,
          from: msg.from ?? msg.raw_digits ?? null,
          to: msg.to ?? null,
          content: msg.content ?? msg.body ?? null,
          numberId: msg.number?.id ?? msg.number_id ?? null,
          contactId: msg.contact?.id ?? msg.contact_id ?? null
        }
      };
    }
  })
  .build();
