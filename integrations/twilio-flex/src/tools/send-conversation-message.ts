import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConversationsClient } from '../lib/conversations-client';
import { spec } from '../spec';

export let sendConversationMessageTool = SlateTool.create(spec, {
  name: 'Send Conversation Message',
  key: 'send_conversation_message',
  description: `Send a message in a Twilio Conversation. Supports text messages and can optionally specify the author identity. Use this to programmatically send messages within an active conversation thread.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      conversationSid: z.string().describe('Conversation SID'),
      body: z.string().optional().describe('Message body text'),
      author: z.string().optional().describe('Identity of the message author'),
      attributes: z.string().optional().describe('JSON string of custom message attributes'),
      mediaContentType: z
        .string()
        .optional()
        .describe('Media content type (e.g., "image/jpeg")'),
      mediaSid: z.string().optional().describe('Media SID to attach')
    })
  )
  .output(
    z.object({
      messageSid: z.string().describe('SID of the sent message'),
      conversationSid: z.string().describe('Conversation SID'),
      body: z.string().optional().describe('Message body'),
      author: z.string().optional().describe('Message author'),
      dateCreated: z.string().optional().describe('Date created'),
      index: z.number().optional().describe('Message index in the conversation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConversationsClient(ctx.auth.token);

    let params: Record<string, string | undefined> = {
      Body: ctx.input.body,
      Author: ctx.input.author,
      Attributes: ctx.input.attributes,
      MediaContentType: ctx.input.mediaContentType,
      MediaSid: ctx.input.mediaSid
    };

    let result = await client.sendMessage(ctx.input.conversationSid, params);

    return {
      output: {
        messageSid: result.sid,
        conversationSid: result.conversation_sid,
        body: result.body,
        author: result.author,
        dateCreated: result.date_created,
        index: result.index
      },
      message: `Sent message **${result.sid}** in conversation **${ctx.input.conversationSid}**.`
    };
  })
  .build();
