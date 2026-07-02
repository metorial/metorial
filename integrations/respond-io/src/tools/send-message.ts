import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a message to a contact through a connected channel. Supports text messages, media/attachments (image, video, audio, file), and custom payloads. If no channel is specified, the message is sent through the last interacted channel.`,
  instructions: [
    'Custom payload messages are only supported for Telegram, Facebook, Viber, and LINE channels.',
    'For WhatsApp template messages, use the Send Template Message tool instead.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to send the message to'),
      messageType: z.enum(['text', 'attachment']).describe('Type of message to send'),
      text: z.string().optional().describe('Text content for a text message'),
      attachmentType: z
        .enum(['image', 'video', 'audio', 'file'])
        .optional()
        .describe('Type of attachment when messageType is "attachment"'),
      attachmentUrl: z.string().optional().describe('URL of the attachment file'),
      channelId: z
        .string()
        .optional()
        .describe('Channel ID to send through. If omitted, uses the last interacted channel.')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the sent message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let message: Record<string, any>;

    if (ctx.input.messageType === 'text') {
      message = {
        type: 'text',
        text: ctx.input.text
      };
    } else {
      message = {
        type: 'attachment',
        attachment: {
          type: ctx.input.attachmentType,
          url: ctx.input.attachmentUrl
        }
      };
    }

    let result = await client.sendMessage(ctx.input.contactId, message, ctx.input.channelId);
    let data = result?.data || result;

    return {
      output: {
        messageId: String(data?.id || data?.messageId || '')
      },
      message: `Sent **${ctx.input.messageType}** message to contact **${ctx.input.contactId}**${ctx.input.channelId ? ` via channel ${ctx.input.channelId}` : ''}.`
    };
  })
  .build();
