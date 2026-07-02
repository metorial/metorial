import { SlateTool } from 'slates';
import { z } from 'zod';
import { DriftClient } from '../lib/client';
import { driftServiceError } from '../lib/errors';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a message in an existing Drift conversation. Can send chat messages visible to the contact or private notes visible only to agents. Supports interactive buttons.`,
  instructions: [
    'Message body supports HTML tags like <a>, <p>, <b>.',
    'Use type "private_note" for internal notes only visible to agents.',
    'If no userId is specified, the message is sent as the bot user.'
  ]
})
  .input(
    z.object({
      conversationId: z.string().describe('ID of the conversation to send a message in'),
      type: z
        .enum(['chat', 'private_note'])
        .describe('Message type: "chat" for visible messages, "private_note" for agent-only'),
      body: z.string().optional().describe('Message content (supports HTML)'),
      buttons: z
        .array(
          z.object({
            label: z.string().describe('Button display text'),
            value: z.string().describe('Button value sent when clicked'),
            type: z.string().optional().describe('Button type'),
            style: z.string().optional().describe('Button style')
          })
        )
        .optional()
        .describe('Interactive buttons to include in the message'),
      userId: z
        .number()
        .optional()
        .describe('Drift user ID to send the message as (defaults to bot)')
    })
  )
  .output(
    z.object({
      messageId: z.string().optional().describe('ID of the sent message'),
      conversationId: z.string().describe('Conversation the message was sent in'),
      type: z.string().describe('Type of message sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DriftClient(ctx.auth.token);

    if (!ctx.input.body && !ctx.input.buttons?.length) {
      throw driftServiceError('body or buttons is required to send a Drift message.');
    }

    let result = await client.sendMessage(ctx.input.conversationId, {
      type: ctx.input.type,
      body: ctx.input.body,
      buttons: ctx.input.buttons,
      userId: ctx.input.userId
    });

    let messageId = result?.messages?.[0]?.id || result?.id;

    return {
      output: {
        messageId: messageId ? String(messageId) : undefined,
        conversationId: ctx.input.conversationId,
        type: ctx.input.type
      },
      message: `Sent ${ctx.input.type === 'private_note' ? 'private note' : 'message'} in conversation \`${ctx.input.conversationId}\`.`
    };
  })
  .build();
