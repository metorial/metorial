import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwilioClient } from '../lib/client';
import { twilioServiceError } from '../lib/errors';
import { spec } from '../spec';

export let sendConversationMessage = SlateTool.create(spec, {
  name: 'Send Conversation Message',
  key: 'send_conversation_message',
  description: `Send a message within a Twilio Conversation. Messages are automatically delivered to all participants across their respective channels (SMS, WhatsApp, chat). Also supports listing messages in a conversation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['send', 'list']).default('send').describe('Action to perform.'),
      conversationSid: z.string().describe('SID of the conversation (starts with CH).'),
      body: z
        .string()
        .optional()
        .describe('Message body text (required for "send" action, up to 1600 characters).'),
      author: z.string().optional().describe('Author of the message. Defaults to "system".'),
      attributes: z
        .string()
        .optional()
        .describe('JSON string of custom attributes (for "send" action).'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of messages to return for list action (default 50).'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order for list action.')
    })
  )
  .output(
    z.object({
      messages: z
        .array(
          z.object({
            messageSid: z.string().describe('SID of the message'),
            conversationSid: z.string().describe('SID of the conversation'),
            body: z.string().nullable().describe('Message body text'),
            author: z.string().nullable().describe('Author of the message'),
            participantSid: z
              .string()
              .nullable()
              .describe('SID of the participant who sent the message'),
            index: z.number().nullable().describe('Message index in the conversation'),
            dateCreated: z.string().nullable().describe('Date the message was created')
          })
        )
        .describe('Message(s) returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwilioClient({
      accountSid: ctx.config.accountSid,
      token: ctx.auth.token,
      apiKeySid: ctx.auth.apiKeySid
    });

    let mapMessage = (m: any) => ({
      messageSid: m.sid,
      conversationSid: m.conversation_sid,
      body: m.body || null,
      author: m.author || null,
      participantSid: m.participant_sid || null,
      index: m.index ?? null,
      dateCreated: m.date_created || null
    });

    if (ctx.input.action === 'send') {
      if (!ctx.input.body) throw twilioServiceError('body is required for send action');
      let result = await client.sendConversationMessage(ctx.input.conversationSid, {
        body: ctx.input.body,
        author: ctx.input.author,
        attributes: ctx.input.attributes
      });
      return {
        output: { messages: [mapMessage(result)] },
        message: `Sent message **${result.sid}** in conversation **${ctx.input.conversationSid}**.`
      };
    }

    if (ctx.input.action === 'list') {
      let result = await client.listConversationMessages(ctx.input.conversationSid, {
        pageSize: ctx.input.pageSize,
        order: ctx.input.order
      });
      let messages = (result.messages || []).map(mapMessage);
      return {
        output: { messages },
        message: `Found **${messages.length}** message(s) in conversation **${ctx.input.conversationSid}**.`
      };
    }

    throw twilioServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
