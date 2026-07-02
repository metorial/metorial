import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let conversationUpdated = SlateTrigger.create(spec, {
  name: 'Conversation Updated',
  key: 'conversation_updated',
  description:
    "Triggers when a conversation's status, assignee, contact, or tags are modified in a shared mailbox."
})
  .input(
    z.object({
      eventType: z.string().describe('Type of update that occurred'),
      eventId: z.string().describe('Unique identifier for this event'),
      conversationId: z.string().describe('ID of the conversation that was updated'),
      inboxId: z.string().optional().describe('ID of the inbox containing the conversation'),
      subject: z.string().optional().describe('Subject of the conversation'),
      status: z.string().optional().describe('Current status of the conversation'),
      previousStatus: z.string().optional().describe('Previous status before update'),
      assignee: z.record(z.string(), z.unknown()).optional().describe('Current assignee'),
      previousAssignee: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Previous assignee before update'),
      tags: z.array(z.record(z.string(), z.unknown())).optional().describe('Current tags'),
      contact: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Contact associated with the conversation'),
      updatedAt: z.string().optional().describe('Timestamp of the update'),
      rawPayload: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      conversationId: z.string().describe('ID of the updated conversation'),
      inboxId: z.string().optional().describe('ID of the inbox'),
      subject: z.string().optional().describe('Subject of the conversation'),
      status: z.string().optional().describe('Current status'),
      previousStatus: z.string().optional().describe('Previous status'),
      assignee: z.record(z.string(), z.unknown()).optional().describe('Current assignee'),
      previousAssignee: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Previous assignee'),
      tags: z.array(z.record(z.string(), z.unknown())).optional().describe('Current tags'),
      contact: z.record(z.string(), z.unknown()).optional().describe('Contact information'),
      updatedAt: z.string().optional().describe('Timestamp of the update')
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

        return {
          eventType: event.event_type ?? event.type ?? 'conversation.updated',
          eventId: event.event_id ?? event.id ?? `conv-upd-${conversationId}-${Date.now()}`,
          conversationId,
          inboxId: conversation.inbox_id ? String(conversation.inbox_id) : undefined,
          subject: conversation.subject,
          status: conversation.status,
          previousStatus: event.previous_status ?? event.old_status,
          assignee: conversation.assignee,
          previousAssignee: event.previous_assignee ?? event.old_assignee,
          tags: conversation.tags,
          contact: conversation.contact,
          updatedAt: conversation.updated_at ?? event.timestamp ?? new Date().toISOString(),
          rawPayload: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: 'conversation.updated',
        id: ctx.input.eventId,
        output: {
          conversationId: ctx.input.conversationId,
          inboxId: ctx.input.inboxId,
          subject: ctx.input.subject,
          status: ctx.input.status,
          previousStatus: ctx.input.previousStatus,
          assignee: ctx.input.assignee,
          previousAssignee: ctx.input.previousAssignee,
          tags: ctx.input.tags,
          contact: ctx.input.contact,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  });
