import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { crispServiceError } from '../lib/errors';
import { spec } from '../spec';

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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
      fingerprint: z.number().optional().describe('Unique fingerprint of the sent message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteId: ctx.config.websiteId,
      tier: ctx.auth.tier
    });

    if (['text', 'note'].includes(ctx.input.type) && typeof ctx.input.content !== 'string') {
      throw crispServiceError(`${ctx.input.type} messages require string content.`);
    }

    if (
      ['file', 'animation', 'audio'].includes(ctx.input.type) &&
      (!isRecord(ctx.input.content) ||
        typeof ctx.input.content.url !== 'string' ||
        typeof ctx.input.content.type !== 'string')
    ) {
      throw crispServiceError(
        `${ctx.input.type} messages require content with url and MIME type fields.`
      );
    }

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
