import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMessages = SlateTool.create(spec, {
  name: 'Get Messages',
  key: 'get_messages',
  description: `Retrieve messages from a conversation. Returns the most recent messages by default. Use timestampBefore for pagination to load older messages.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('The session ID of the conversation'),
      timestampBefore: z
        .number()
        .optional()
        .describe('Get messages before this timestamp (milliseconds) for pagination')
    })
  )
  .output(
    z.object({
      messages: z
        .array(
          z.object({
            fingerprint: z.number().optional().describe('Unique message fingerprint'),
            type: z.string().optional().describe('Message type (text, note, file, etc.)'),
            from: z.string().optional().describe('Sender: operator or user'),
            origin: z.string().optional().describe('Origin channel'),
            content: z.any().optional().describe('Message content'),
            timestamp: z.number().optional().describe('Message timestamp in milliseconds'),
            read: z.string().optional().describe('Read acknowledgement status'),
            delivered: z.string().optional().describe('Delivery status'),
            senderNickname: z.string().optional().describe('Sender display name'),
            senderAvatar: z.string().optional().describe('Sender avatar URL')
          })
        )
        .describe('List of messages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteId: ctx.config.websiteId,
      tier: ctx.auth.tier
    });
    let results = await client.getMessagesInConversation(
      ctx.input.sessionId,
      ctx.input.timestampBefore
    );

    let messages = (results || []).map((m: any) => ({
      fingerprint: m.fingerprint,
      type: m.type,
      from: m.from,
      origin: m.origin,
      content: m.content,
      timestamp: m.timestamp,
      read: m.read,
      delivered: m.delivered,
      senderNickname: m.user?.nickname,
      senderAvatar: m.user?.avatar
    }));

    return {
      output: { messages },
      message: `Retrieved **${messages.length}** messages from conversation **${ctx.input.sessionId}**.`
    };
  })
  .build();
