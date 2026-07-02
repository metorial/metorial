import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConversationsClient } from '../lib/conversations-client';
import { spec } from '../spec';

let messageSchema = z.object({
  messageSid: z.string().describe('Message SID'),
  conversationSid: z.string().optional().describe('Conversation SID'),
  body: z.string().optional().describe('Message body'),
  author: z.string().optional().describe('Message author'),
  participantSid: z.string().optional().describe('Participant SID'),
  index: z.number().optional().describe('Message index'),
  dateCreated: z.string().optional().describe('Date created'),
  dateUpdated: z.string().optional().describe('Date updated')
});

export let listConversationMessagesTool = SlateTool.create(spec, {
  name: 'List Conversation Messages',
  key: 'list_conversation_messages',
  description: `List messages in a Twilio Conversation. Returns the message history for a given conversation, including author, body, and timestamps. Use order parameter to sort ascending or descending.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      conversationSid: z.string().describe('Conversation SID'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order by date (asc or desc)'),
      pageSize: z.number().optional().describe('Number of messages to return (max 100)')
    })
  )
  .output(
    z.object({
      messages: z.array(messageSchema).describe('Message records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConversationsClient(ctx.auth.token);

    let result = await client.listMessages(
      ctx.input.conversationSid,
      ctx.input.pageSize,
      ctx.input.order
    );
    let messages = (result.messages || []).map((m: any) => ({
      messageSid: m.sid,
      conversationSid: m.conversation_sid,
      body: m.body,
      author: m.author,
      participantSid: m.participant_sid,
      index: m.index,
      dateCreated: m.date_created,
      dateUpdated: m.date_updated
    }));

    return {
      output: { messages },
      message: `Found **${messages.length}** messages in conversation **${ctx.input.conversationSid}**.`
    };
  })
  .build();
