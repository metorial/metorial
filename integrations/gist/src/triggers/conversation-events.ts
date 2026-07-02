import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let conversationEvents = SlateTrigger.create(spec, {
  name: 'Conversation Events',
  key: 'conversation_events',
  description:
    'Triggers when conversation-related events occur: contact initiated conversation, conversation assigned/opened/closed, conversation rated, message from contact, teammate replied, or note added.'
})
  .input(
    z.object({
      topic: z.string().describe('Webhook topic'),
      timestamp: z.string().optional().describe('Event timestamp'),
      conversationId: z.string().optional().describe('Conversation ID'),
      contactId: z.string().optional().describe('Contact ID'),
      assigneeId: z.string().optional().describe('Assigned teammate ID'),
      teamId: z.string().optional().describe('Assigned team ID'),
      messageBody: z.string().optional().describe('Message body if applicable'),
      messageAuthorId: z.string().optional().describe('Message author ID'),
      messageAuthorType: z
        .string()
        .optional()
        .describe('Message author type (contact or teammate)'),
      rating: z.number().optional().describe('Conversation rating (1-5)'),
      ratingRemark: z.string().optional().describe('Rating remark text'),
      raw: z.any().optional().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      conversationId: z.string().optional().describe('Conversation ID'),
      contactId: z.string().optional().describe('Contact ID'),
      assigneeId: z.string().optional().describe('Assigned teammate ID'),
      teamId: z.string().optional().describe('Assigned team ID'),
      messageBody: z.string().optional().describe('Message body if applicable'),
      messageAuthorId: z.string().optional().describe('Message author ID'),
      messageAuthorType: z.string().optional().describe('Author type'),
      rating: z.number().optional().describe('Conversation rating (1-5)'),
      ratingRemark: z.string().optional().describe('Rating remark text'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let topic = data.topic || '';
      let conversation = data.conversation || data.data?.conversation || {};
      let message = data.message || data.data?.message || {};

      let input: any = {
        topic,
        timestamp: data.timestamp ? String(data.timestamp) : undefined,
        conversationId: conversation.id ? String(conversation.id) : undefined,
        contactId: conversation.contact_id ? String(conversation.contact_id) : undefined,
        assigneeId: conversation.assignee_id ? String(conversation.assignee_id) : undefined,
        teamId: conversation.team_id ? String(conversation.team_id) : undefined,
        raw: data
      };

      if (
        topic === 'message.from_contact' ||
        topic === 'teammate.replied' ||
        topic === 'note.added'
      ) {
        input.messageBody = message.body;
        input.messageAuthorId = message.author_id ? String(message.author_id) : undefined;
        input.messageAuthorType = message.author_type;
      }

      if (topic === 'conversation.rating') {
        let rating = data.rating || data.data?.rating || {};
        input.rating = rating.value || rating.score;
        input.ratingRemark = rating.remark;
      }

      return {
        inputs: [input]
      };
    },

    handleEvent: async ctx => {
      let topicMap: Record<string, string> = {
        'contact.initiated_conversation': 'conversation.initiated',
        'conversation.assigned': 'conversation.assigned',
        'conversation.opened': 'conversation.opened',
        'conversation.closed': 'conversation.closed',
        'conversation.rating': 'conversation.rated',
        'message.from_contact': 'conversation.message_from_contact',
        'teammate.replied': 'conversation.teammate_replied',
        'note.added': 'conversation.note_added'
      };

      let type = topicMap[ctx.input.topic] || ctx.input.topic;
      let id = `${ctx.input.topic}-${ctx.input.conversationId || ''}-${ctx.input.timestamp || Date.now()}`;

      return {
        type,
        id,
        output: {
          conversationId: ctx.input.conversationId,
          contactId: ctx.input.contactId,
          assigneeId: ctx.input.assigneeId,
          teamId: ctx.input.teamId,
          messageBody: ctx.input.messageBody,
          messageAuthorId: ctx.input.messageAuthorId,
          messageAuthorType: ctx.input.messageAuthorType,
          rating: ctx.input.rating,
          ratingRemark: ctx.input.ratingRemark,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
