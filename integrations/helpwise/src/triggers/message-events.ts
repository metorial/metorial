import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let messageEventTypes = ['agent_reply', 'customer_reply'] as const;

export let messageEvents = SlateTrigger.create(spec, {
  name: 'Message Events',
  key: 'message_events',
  description:
    'Triggers when a new message is sent or received in a conversation, including agent replies to customers and customer replies to emails.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of message event (agent_reply or customer_reply)'),
      messageId: z.string().describe('ID of the message'),
      rawPayload: z.record(z.string(), z.any()).describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the message'),
      conversationId: z
        .string()
        .optional()
        .describe('ID of the conversation the message belongs to'),
      mailboxId: z.string().optional().describe('ID of the mailbox'),
      from: z.string().optional().describe('Sender email address'),
      to: z.string().optional().describe('Recipient email address'),
      subject: z.string().optional().describe('Email subject'),
      body: z.string().optional().describe('Message body content'),
      senderType: z.string().optional().describe('Whether the sender is an agent or customer'),
      createdAt: z.string().optional().describe('When the message was sent')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let registeredWebhooks: Array<{ webhookId: string; eventType: string }> = [];

      for (let eventType of messageEventTypes) {
        let webhook = await client.createWebhook({
          url: ctx.input.webhookBaseUrl,
          event_type: eventType
        });
        registeredWebhooks.push({
          webhookId: (webhook.id ?? webhook.webhook_id ?? webhook.webhookId ?? '').toString(),
          eventType
        });
      }

      return {
        registrationDetails: { webhooks: registeredWebhooks }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        webhooks: Array<{ webhookId: string; eventType: string }>;
      };

      for (let webhook of details.webhooks ?? []) {
        if (webhook.webhookId) {
          try {
            await client.deleteWebhook(webhook.webhookId);
          } catch {
            // Ignore errors during cleanup
          }
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let eventType = data.event_type ?? data.eventType ?? data.type ?? 'unknown';
      let message = data.message ?? data.email ?? data;
      let messageId = (message.id ?? message.message_id ?? data.message_id ?? '').toString();

      return {
        inputs: [
          {
            eventType,
            messageId,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, messageId, rawPayload } = ctx.input;
      let message = rawPayload.message ?? rawPayload.email ?? rawPayload;

      let senderType = eventType.includes('agent') ? 'agent' : 'customer';

      let normalizedType = eventType.includes('agent')
        ? 'message.agent_reply'
        : 'message.customer_reply';

      return {
        type: normalizedType,
        id: `${messageId}-${eventType}-${rawPayload.timestamp ?? rawPayload.created_at ?? Date.now()}`,
        output: {
          messageId,
          conversationId:
            (
              message.thread_id ??
              message.conversation_id ??
              rawPayload.thread_id ??
              rawPayload.conversation_id ??
              ''
            ).toString() || undefined,
          mailboxId:
            (message.mailbox_id ?? rawPayload.mailbox_id ?? '').toString() || undefined,
          from: message.from ?? message.from_email ?? rawPayload.from,
          to: message.to ?? message.to_email ?? rawPayload.to,
          subject: message.subject ?? rawPayload.subject,
          body: message.body ?? message.text ?? rawPayload.body,
          senderType,
          createdAt: message.created_at ?? rawPayload.created_at ?? rawPayload.timestamp
        }
      };
    }
  })
  .build();
