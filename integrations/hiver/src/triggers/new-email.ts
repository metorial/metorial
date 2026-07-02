import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let newEmail = SlateTrigger.create(spec, {
  name: 'New Email Activity',
  key: 'new_email',
  description:
    'Triggers when an email is sent from or received into a shared mailbox. Covers both inbound and outbound email activity.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of email event (sent or received)'),
      eventId: z.string().describe('Unique identifier for this event'),
      conversationId: z.string().describe('ID of the conversation this email belongs to'),
      inboxId: z.string().optional().describe('ID of the shared mailbox'),
      subject: z.string().optional().describe('Email subject'),
      from: z.record(z.string(), z.unknown()).optional().describe('Sender information'),
      to: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Recipient information'),
      status: z.string().optional().describe('Status of the conversation'),
      assignee: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Assignee of the conversation'),
      tags: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Tags on the conversation'),
      timestamp: z.string().optional().describe('Timestamp of the email event'),
      rawPayload: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      conversationId: z.string().describe('ID of the conversation'),
      inboxId: z.string().optional().describe('ID of the shared mailbox'),
      subject: z.string().optional().describe('Email subject'),
      from: z.record(z.string(), z.unknown()).optional().describe('Sender information'),
      to: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Recipient information'),
      status: z.string().optional().describe('Conversation status'),
      assignee: z.record(z.string(), z.unknown()).optional().describe('Conversation assignee'),
      tags: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Conversation tags'),
      timestamp: z.string().optional().describe('Timestamp of the email event')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;
      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: Record<string, any>) => {
        let email = event.email ?? event.data ?? event;
        let conversation = email.conversation ?? email;
        let conversationId = String(
          conversation.conversation_id ?? conversation.id ?? event.id ?? ''
        );

        return {
          eventType: event.event_type ?? event.type ?? 'email.activity',
          eventId: event.event_id ?? event.id ?? `email-${conversationId}-${Date.now()}`,
          conversationId,
          inboxId: conversation.inbox_id ? String(conversation.inbox_id) : undefined,
          subject: email.subject ?? conversation.subject,
          from: email.from,
          to: Array.isArray(email.to) ? email.to : email.to ? [email.to] : undefined,
          status: conversation.status,
          assignee: conversation.assignee,
          tags: conversation.tags,
          timestamp: email.timestamp ?? event.timestamp ?? new Date().toISOString(),
          rawPayload: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: 'email.activity',
        id: ctx.input.eventId,
        output: {
          conversationId: ctx.input.conversationId,
          inboxId: ctx.input.inboxId,
          subject: ctx.input.subject,
          from: ctx.input.from,
          to: ctx.input.to,
          status: ctx.input.status,
          assignee: ctx.input.assignee,
          tags: ctx.input.tags,
          timestamp: ctx.input.timestamp
        }
      };
    }
  });
