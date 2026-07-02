import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let newConversation = SlateTrigger.create(spec, {
  name: 'New Conversation',
  key: 'new_conversation',
  description:
    'Triggers when a new inbound or outbound conversation is created in a shared mailbox. Covers both incoming messages and new outbound threads.'
})
  .input(
    z.object({
      direction: z
        .enum(['inbound', 'outbound', 'unknown'])
        .describe('Whether the conversation is inbound or outbound'),
      eventId: z.string().describe('Unique identifier for this event'),
      conversationId: z.string().describe('ID of the new conversation'),
      inboxId: z.string().optional().describe('ID of the shared mailbox'),
      subject: z.string().optional().describe('Subject of the conversation'),
      from: z.record(z.string(), z.unknown()).optional().describe('Sender information'),
      to: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Recipient information'),
      status: z.string().optional().describe('Initial status of the conversation'),
      assignee: z.record(z.string(), z.unknown()).optional().describe('Assigned user'),
      tags: z.array(z.record(z.string(), z.unknown())).optional().describe('Initial tags'),
      createdAt: z.string().optional().describe('Timestamp of conversation creation'),
      rawPayload: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      conversationId: z.string().describe('ID of the new conversation'),
      direction: z
        .enum(['inbound', 'outbound', 'unknown'])
        .describe('Whether the conversation is inbound or outbound'),
      inboxId: z.string().optional().describe('ID of the shared mailbox'),
      subject: z.string().optional().describe('Subject of the conversation'),
      from: z.record(z.string(), z.unknown()).optional().describe('Sender information'),
      to: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Recipient information'),
      status: z.string().optional().describe('Initial status'),
      assignee: z.record(z.string(), z.unknown()).optional().describe('Assigned user'),
      tags: z.array(z.record(z.string(), z.unknown())).optional().describe('Initial tags'),
      createdAt: z.string().optional().describe('Timestamp of creation')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;
      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: Record<string, any>) => {
        let conversation = event.conversation ?? event.data ?? event;
        let conversationId = String(
          conversation.id ?? conversation.conversation_id ?? event.id ?? ''
        );
        let eventType = event.event_type ?? event.type ?? '';

        let direction: 'inbound' | 'outbound' | 'unknown' = 'unknown';
        if (eventType.includes('inbound') || eventType.includes('received')) {
          direction = 'inbound';
        } else if (eventType.includes('outbound') || eventType.includes('sent')) {
          direction = 'outbound';
        }

        return {
          direction,
          eventId: event.event_id ?? event.id ?? `conv-new-${conversationId}-${Date.now()}`,
          conversationId,
          inboxId: conversation.inbox_id ? String(conversation.inbox_id) : undefined,
          subject: conversation.subject,
          from: conversation.from,
          to: Array.isArray(conversation.to)
            ? conversation.to
            : conversation.to
              ? [conversation.to]
              : undefined,
          status: conversation.status,
          assignee: conversation.assignee,
          tags: conversation.tags,
          createdAt: conversation.created_at ?? event.timestamp ?? new Date().toISOString(),
          rawPayload: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      let type =
        ctx.input.direction === 'inbound'
          ? 'conversation.inbound'
          : ctx.input.direction === 'outbound'
            ? 'conversation.outbound'
            : 'conversation.created';

      return {
        type,
        id: ctx.input.eventId,
        output: {
          conversationId: ctx.input.conversationId,
          direction: ctx.input.direction,
          inboxId: ctx.input.inboxId,
          subject: ctx.input.subject,
          from: ctx.input.from,
          to: ctx.input.to,
          status: ctx.input.status,
          assignee: ctx.input.assignee,
          tags: ctx.input.tags,
          createdAt: ctx.input.createdAt
        }
      };
    }
  });
