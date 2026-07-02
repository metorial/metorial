import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a message in a Crisp conversation. Supports text messages, notes (internal), file attachments, and other message types. Messages can be sent as an operator or as a user.`,
  instructions: [
    'For text messages, set type to "text" and content to the message string.',
    'For internal notes visible only to operators, set type to "note".',
    'For file messages, set type to "file" and content to an object with name, url, and type (MIME).',
    'Use stealth mode to send messages without triggering notifications.'
  ]
})
  .input(
    z.object({
      sessionId: z.string().describe('The session ID of the conversation'),
      type: z
        .enum([
          'text',
          'note',
          'file',
          'animation',
          'audio',
          'picker',
          'field',
          'carousel',
          'event'
        ])
        .describe('Message type'),
      from: z.enum(['operator', 'user']).describe('Who is sending the message'),
      origin: z
        .string()
        .default('chat')
        .describe('Message origin channel (e.g., "chat", "email")'),
      content: z
        .any()
        .describe('Message content — string for text/note, object for file/picker/carousel'),
      stealth: z
        .boolean()
        .optional()
        .describe('Send without triggering visitor notifications'),
      senderNickname: z.string().optional().describe('Override the sender display name'),
      senderAvatar: z.string().optional().describe('Override the sender avatar URL')
    })
  )
  .output(
    z.object({
      fingerprint: z.string().optional().describe('Unique fingerprint of the sent message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, websiteId: ctx.config.websiteId });

    let message: any = {
      type: ctx.input.type,
      from: ctx.input.from,
      origin: ctx.input.origin,
      content: ctx.input.content
    };

    if (ctx.input.stealth !== undefined) message.stealth = ctx.input.stealth;
    if (ctx.input.senderNickname || ctx.input.senderAvatar) {
      message.user = {};
      if (ctx.input.senderNickname) message.user.nickname = ctx.input.senderNickname;
      if (ctx.input.senderAvatar) message.user.avatar = ctx.input.senderAvatar;
    }

    let result = await client.sendMessageInConversation(ctx.input.sessionId, message);

    return {
      output: {
        fingerprint: result?.fingerprint
      },
      message: `Sent ${ctx.input.type} message in conversation **${ctx.input.sessionId}** from ${ctx.input.from}.`
    };
  })
  .build();
