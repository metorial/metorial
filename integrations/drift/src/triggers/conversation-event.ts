import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let conversationEvent = SlateTrigger.create(spec, {
  name: 'Conversation Event',
  key: 'conversation_event',
  description:
    'Triggers on conversation events including new conversations, new messages, conversation pushes, participant changes, button clicks, and inactivity.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of conversation event'),
      eventId: z.string().describe('Unique event identifier for deduplication'),
      conversationId: z.number().optional().describe('Conversation ID'),
      contactId: z.number().optional().describe('Contact ID involved'),
      body: z.string().optional().describe('Message body (for message events)'),
      authorType: z.string().optional().describe('Message author type: user or contact'),
      authorId: z.number().optional().describe('Author ID'),
      messageType: z.string().optional().describe('Message type: chat or private_note'),
      participants: z.array(z.number()).optional().describe('Participant user IDs'),
      status: z.string().optional().describe('Conversation status'),
      createdAt: z.number().optional().describe('Event timestamp'),
      raw: z.any().optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      conversationId: z.number().optional().describe('Drift conversation ID'),
      contactId: z.number().optional().describe('Associated contact ID'),
      body: z.string().optional().describe('Message body if applicable'),
      authorType: z.string().optional().describe('Author type: user or contact'),
      authorId: z.number().optional().describe('Author ID'),
      messageType: z.string().optional().describe('Message type'),
      participants: z.array(z.number()).optional().describe('Participant user IDs'),
      status: z.string().optional().describe('Conversation status'),
      createdAt: z.number().optional().describe('Event timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.type || 'unknown';
      let eventData = data.data || {};
      let conversationId = eventData.conversationId || eventData.id;
      let timestamp = data.createdAt || Date.now();

      let supportedTypes = [
        'new_conversation',
        'new_message',
        'new_command_message',
        'conversation_push',
        'conversation_inactive',
        'conversation_manual_push',
        'conversation_participant_added',
        'conversation_participant_removed',
        'button_clicked'
      ];

      if (!supportedTypes.includes(eventType)) {
        return { inputs: [] };
      }

      let messageBody = eventData.body;
      let authorType: string | undefined;
      let authorId: number | undefined;
      let messageType: string | undefined;

      if (eventType === 'new_message' || eventType === 'new_command_message') {
        authorType = eventData.author?.type;
        authorId = eventData.author?.id;
        messageType = eventData.type === 'private_note' ? 'private_note' : 'chat';
        messageBody = eventData.body;
      }

      return {
        inputs: [
          {
            eventType,
            eventId: `${eventType}-${conversationId}-${timestamp}`,
            conversationId,
            contactId: eventData.contactId,
            body: messageBody,
            authorType,
            authorId,
            messageType,
            participants: eventData.participants,
            status: eventData.status,
            createdAt: timestamp,
            raw: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `conversation.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          conversationId: ctx.input.conversationId,
          contactId: ctx.input.contactId,
          body: ctx.input.body,
          authorType: ctx.input.authorType,
          authorId: ctx.input.authorId,
          messageType: ctx.input.messageType,
          participants: ctx.input.participants,
          status: ctx.input.status,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
