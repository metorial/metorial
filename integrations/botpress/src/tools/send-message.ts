import { SlateTool } from 'slates';
import { z } from 'zod';
import { RuntimeClient } from '../lib/client';
import { spec } from '../spec';

export let sendMessageTool = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a message to a conversation via the Runtime API. Supports text, image, audio, video, file, location, card, carousel, choice, and dropdown message types. The **payload** must match the expected format for the given **messageType**.`,
  instructions: [
    'For text messages, set messageType to "text" and include { "text": "your message" } in the payload.',
    'For image messages, set messageType to "image" and include { "imageUrl": "url" } in the payload.',
    'For choice messages, set messageType to "choice" and include { "text": "prompt", "options": [{ "label": "Option", "value": "opt" }] } in the payload.'
  ]
})
  .input(
    z.object({
      botId: z.string().optional().describe('Bot ID. Falls back to config botId.'),
      conversationId: z.string().describe('Conversation to send the message to'),
      userId: z.string().describe('User ID sending the message'),
      messageType: z
        .string()
        .describe(
          'Message type, e.g. "text", "image", "audio", "video", "file", "card", "carousel", "choice", "dropdown", "location"'
        ),
      payload: z
        .record(z.string(), z.unknown())
        .describe('Message payload matching the message type format'),
      tags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Tags to attach to the message')
    })
  )
  .output(
    z.object({
      messageId: z.string(),
      conversationId: z.string(),
      userId: z.string(),
      createdAt: z.string(),
      direction: z.string().optional(),
      messageType: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let botId = ctx.input.botId || ctx.config.botId;
    if (!botId) throw new Error('botId is required (provide in input or config)');

    let client = new RuntimeClient({ token: ctx.auth.token, botId });

    let result = await client.createMessage({
      payload: ctx.input.payload,
      userId: ctx.input.userId,
      conversationId: ctx.input.conversationId,
      type: ctx.input.messageType,
      tags: ctx.input.tags
    });

    let msg = result.message;
    return {
      output: {
        messageId: msg.id,
        conversationId: msg.conversationId,
        userId: msg.userId,
        createdAt: msg.createdAt,
        direction: msg.direction,
        messageType: msg.type
      },
      message: `Sent **${ctx.input.messageType}** message to conversation **${ctx.input.conversationId}**.`
    };
  })
  .build();
