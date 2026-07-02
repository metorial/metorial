import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwoChatClient } from '../lib/client';
import { spec } from '../spec';

export let sendWhatsAppMessage = SlateTool.create(spec, {
  name: 'Send WhatsApp Message',
  key: 'send_whatsapp_message',
  description: `Send a text or media message to a WhatsApp user. Supports text messages, images, audio, video, PDFs, and other files. Media attachments must be publicly accessible URLs.`,
  instructions: [
    'Phone numbers must include the country code (e.g., +1234567890).',
    'To send media, provide a publicly accessible URL. You can optionally include a caption with media messages.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      fromNumber: z
        .string()
        .describe('Your connected WhatsApp number (with country code, e.g., +1234567890)'),
      toNumber: z
        .string()
        .describe('Recipient WhatsApp number (with country code, e.g., +1234567890)'),
      text: z.string().optional().describe('Text content of the message or caption for media'),
      mediaUrl: z
        .string()
        .optional()
        .describe('Publicly accessible URL of media to send (image, audio, video, PDF, etc.)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the message was sent successfully'),
      messageUuid: z.string().optional().describe('UUID of the sent message'),
      sentAt: z.string().optional().describe('Timestamp when the message was sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwoChatClient({ token: ctx.auth.token });

    let result: any;

    if (ctx.input.mediaUrl) {
      result = await client.sendMediaMessage({
        fromNumber: ctx.input.fromNumber,
        toNumber: ctx.input.toNumber,
        url: ctx.input.mediaUrl,
        text: ctx.input.text
      });
    } else {
      result = await client.sendTextMessage({
        fromNumber: ctx.input.fromNumber,
        toNumber: ctx.input.toNumber,
        text: ctx.input.text || ''
      });
    }

    return {
      output: {
        success: result.success ?? true,
        messageUuid: result.uuid || result.message_uuid,
        sentAt: result.sent_at || result.created_at
      },
      message: `Message sent to **${ctx.input.toNumber}** from **${ctx.input.fromNumber}**.`
    };
  })
  .build();
