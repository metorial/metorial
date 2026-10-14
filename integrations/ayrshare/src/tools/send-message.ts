import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a direct message on Facebook, Instagram, or X/Twitter. Supports text messages and media attachments (images, videos, voice files).`,
  constraints: [
    'Messaging must be activated for the account and user profile.',
    'X/Twitter accepts only a single media URL.',
    'Facebook and Instagram voice messages must be .aac or .wav format.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      platform: z
        .enum(['facebook', 'instagram', 'twitter'])
        .describe('Platform to send the message on'),
      recipientId: z.string().describe('ID of the message recipient'),
      message: z.string().optional().describe('Text content of the message'),
      mediaUrls: z
        .array(z.string())
        .optional()
        .describe('Media URLs to include (images, videos, voice files)')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Message sending status'),
      messages: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Individual text and media message results'),
      messageId: z.string().optional().describe('Generated message identifier'),
      recipientId: z.string().optional().describe('Recipient ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      ...ctx.auth,
      profileKey: ctx.config.profileKey
    });

    let result = await client.sendMessage({
      platform: ctx.input.platform,
      recipientId: ctx.input.recipientId,
      message: ctx.input.message,
      mediaUrls: ctx.input.mediaUrls
    });

    return {
      output: {
        status: result.status || 'success',
        messageId: result.messageId ?? result.messages?.[0]?.messageId,
        recipientId: result.recipientId ?? result.messages?.[0]?.recipientId,
        messages: result.messages
      },
      message: `Message sent to **${ctx.input.recipientId}** on **${ctx.input.platform}**. Status: **${result.status}**.`
    };
  })
  .build();
