import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a direct message on Facebook, Instagram, or X/Twitter. Supports text messages and media attachments (images, videos, voice files).`,
  constraints: [
    'Requires Business plan or above.',
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
      messageId: z.string().optional().describe('Generated message identifier'),
      recipientId: z.string().optional().describe('Recipient ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
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
        messageId: result.messageId,
        recipientId: result.recipientId
      },
      message: `Message sent to **${ctx.input.recipientId}** on **${ctx.input.platform}**. Message ID: **${result.messageId}**.`
    };
  })
  .build();
