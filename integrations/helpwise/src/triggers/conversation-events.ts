import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let conversationEventTypes = [
  'conversation_created',
  'conversation_closed',
  'conversation_reopened',
  'conversation_deleted',
  'conversation_assigned',
  'note_added',
  'tag_applied'
] as const;

export let conversationEvents = SlateTrigger.create(spec, {
  name: 'Conversation Events',
  key: 'conversation_events',
  description:
    'Triggers when conversation lifecycle events occur, including creation, closure, reopening, deletion, assignment, note additions, and tag applications.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of conversation event'),
      conversationId: z.string().describe('ID of the affected conversation'),
      rawPayload: z.record(z.string(), z.any()).describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      conversationId: z.string().describe('ID of the affected conversation'),
      mailboxId: z
        .string()
        .optional()
        .describe('ID of the mailbox the conversation belongs to'),
      subject: z.string().optional().describe('Conversation subject'),
      status: z.string().optional().describe('Current conversation status'),
      assignedTo: z.string().optional().describe('User/agent assigned to the conversation'),
      tagName: z
        .string()
        .optional()
        .describe('Name of the tag applied (for tag_applied events)'),
      noteBody: z.string().optional().describe('Note content (for note_added events)'),
      customerEmail: z.string().optional().describe('Customer email address'),
      createdAt: z.string().optional().describe('When the event occurred')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let registeredWebhooks: Array<{ webhookId: string; eventType: string }> = [];

      for (let eventType of conversationEventTypes) {
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
      let conversation = data.conversation ?? data.thread ?? data;
      let conversationId = (
        conversation.id ??
        conversation.conversation_id ??
        conversation.thread_id ??
        data.conversation_id ??
        data.thread_id ??
        ''
      ).toString();

      return {
        inputs: [
          {
            eventType,
            conversationId,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, conversationId, rawPayload } = ctx.input;
      let conversation = rawPayload.conversation ?? rawPayload.thread ?? rawPayload;

      let normalizedType = eventType.replace(/\s+/g, '_').toLowerCase();

      if (
        !normalizedType.startsWith('conversation.') &&
        !normalizedType.startsWith('conversation_')
      ) {
        normalizedType = `conversation.${normalizedType}`;
      } else {
        normalizedType = normalizedType.replace('conversation_', 'conversation.');
      }

      return {
        type: normalizedType,
        id: `${conversationId}-${eventType}-${rawPayload.timestamp ?? rawPayload.created_at ?? Date.now()}`,
        output: {
          conversationId,
          mailboxId:
            (
              conversation.mailbox_id ??
              conversation.mailboxId ??
              rawPayload.mailbox_id ??
              ''
            ).toString() || undefined,
          subject: conversation.subject ?? rawPayload.subject,
          status: conversation.status ?? rawPayload.status,
          assignedTo:
            (
              rawPayload.assigned_to ??
              rawPayload.assignee ??
              conversation.assigned_to ??
              ''
            ).toString() || undefined,
          tagName: rawPayload.tag_name ?? rawPayload.tag?.name,
          noteBody: rawPayload.note?.body ?? rawPayload.note_body,
          customerEmail:
            conversation.customer_email ??
            conversation.from_email ??
            rawPayload.customer_email,
          createdAt: rawPayload.created_at ?? rawPayload.timestamp ?? conversation.created_at
        }
      };
    }
  })
  .build();
