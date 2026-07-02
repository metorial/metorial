import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { spec } from '../spec';

export let conversationEvents = SlateTrigger.create(spec, {
  name: 'Conversation Events',
  key: 'conversation_events',
  description:
    'Triggers when conversations are created, replied to, assigned, opened, closed, snoozed, rated, or when tags/contacts change.'
})
  .input(
    z.object({
      topic: z.string().describe('Webhook topic'),
      eventId: z.string().describe('Unique event identifier'),
      conversation: z.any().describe('Conversation data from webhook payload')
    })
  )
  .output(
    z.object({
      conversationId: z.string().describe('Conversation ID'),
      state: z.string().optional().describe('Conversation state'),
      title: z.string().optional().describe('Conversation title'),
      open: z.boolean().optional().describe('Whether conversation is open'),
      priority: z.string().optional().describe('Conversation priority'),
      assigneeId: z.string().optional().describe('Current assignee ID'),
      assigneeType: z.string().optional().describe('Assignee type'),
      adminAssigneeId: z.string().optional().describe('Admin assignee ID'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      sourceBody: z.string().optional().describe('Source message body'),
      sourceAuthorType: z.string().optional().describe('Source author type'),
      sourceAuthorId: z.string().optional().describe('Source author ID'),
      ratingValue: z
        .number()
        .optional()
        .describe('Conversation rating value (for rating events)'),
      ratingRemark: z
        .string()
        .optional()
        .describe('Conversation rating remark (for rating events)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let topic = data.topic || '';
      let conversationTopics = [
        'conversation.user.created',
        'conversation.user.replied',
        'conversation.admin.single.created',
        'conversation.admin.replied',
        'conversation.admin.assigned',
        'conversation.admin.noted',
        'conversation.admin.closed',
        'conversation.admin.opened',
        'conversation.admin.snoozed',
        'conversation.admin.unsnoozed',
        'conversation.admin.open.assigned',
        'conversation.operator.replied',
        'conversation.deleted',
        'conversation.read',
        'conversation.rating.added',
        'conversation.priority.updated',
        'conversation.contact.attached',
        'conversation.contact.detached',
        'conversation.company.updated',
        'conversation_part.tag.created',
        'conversation_part.redacted'
      ];

      if (!conversationTopics.includes(topic)) {
        return { inputs: [] };
      }

      let eventId =
        data.id || `${topic}-${data.data?.item?.id || ''}-${data.created_at || Date.now()}`;

      return {
        inputs: [
          {
            topic,
            eventId,
            conversation: data.data?.item
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let conv = ctx.input.conversation || {};

      return {
        type: ctx.input.topic,
        id: ctx.input.eventId,
        output: {
          conversationId: conv.id || '',
          state: conv.state,
          title: conv.title,
          open: conv.open,
          priority: conv.priority,
          assigneeId: conv.assignee?.id ? String(conv.assignee.id) : undefined,
          assigneeType: conv.assignee?.type,
          adminAssigneeId: conv.admin_assignee_id ? String(conv.admin_assignee_id) : undefined,
          createdAt: conv.created_at ? String(conv.created_at) : undefined,
          updatedAt: conv.updated_at ? String(conv.updated_at) : undefined,
          sourceBody: conv.source?.body,
          sourceAuthorType: conv.source?.author?.type,
          sourceAuthorId: conv.source?.author?.id ? String(conv.source.author.id) : undefined,
          ratingValue: conv.conversation_rating?.rating,
          ratingRemark: conv.conversation_rating?.remark
        }
      };
    }
  })
  .build();
