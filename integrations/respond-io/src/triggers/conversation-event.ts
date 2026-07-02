import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let conversationEvent = SlateTrigger.create(spec, {
  name: 'Conversation Event',
  key: 'conversation_event',
  description: 'Triggers when a conversation is opened or closed for a contact.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of conversation event (conversation.opened or conversation.closed)'),
      contactId: z.string().describe('ID of the contact'),
      conversationStatus: z
        .string()
        .optional()
        .describe('Conversation status (open or closed)'),
      category: z.string().optional().describe('Closing note category'),
      summary: z.string().optional().describe('Closing note summary'),
      contactName: z.string().optional().describe('Name of the contact'),
      assignee: z.any().optional().describe('Assigned user'),
      timestamp: z.string().optional().describe('Event timestamp'),
      rawPayload: z.any().optional().describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the contact'),
      conversationStatus: z
        .string()
        .optional()
        .describe('Conversation status (open or closed)'),
      category: z.string().optional().describe('Closing note category'),
      summary: z.string().optional().describe('Closing note summary'),
      contactName: z.string().optional().describe('Name of the contact'),
      assignee: z.any().optional().describe('Assigned user'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any = await ctx.request.json();
      let event = data?.event || data?.type || 'conversation.opened';
      let payload = data?.data || data;

      let contact = payload?.contact || {};
      let conversation = payload?.conversation || payload;

      let normalizedEvent = event.includes('closed')
        ? 'conversation.closed'
        : 'conversation.opened';

      return {
        inputs: [
          {
            eventType: normalizedEvent,
            contactId: String(contact?.id || payload?.contactId || ''),
            conversationStatus: normalizedEvent === 'conversation.closed' ? 'closed' : 'open',
            category: conversation?.category,
            summary: conversation?.summary,
            contactName: contact?.firstName
              ? `${contact.firstName} ${contact.lastName || ''}`.trim()
              : undefined,
            assignee: contact?.assignee || payload?.assignee,
            timestamp: conversation?.createdAt || conversation?.closedAt || payload?.timestamp,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: `${ctx.input.contactId}-${ctx.input.eventType}-${ctx.input.timestamp || Date.now()}`,
        output: {
          contactId: ctx.input.contactId,
          conversationStatus: ctx.input.conversationStatus,
          category: ctx.input.category,
          summary: ctx.input.summary,
          contactName: ctx.input.contactName,
          assignee: ctx.input.assignee,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
