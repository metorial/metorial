import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a message to a contact through a connected channel. Supports text messages and media (image, video, audio, file). If no channel is specified, the message is sent through the last interacted channel.`,
  instructions: [
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
      if (!ctx.input.text?.trim())
        throw createApiServiceError('Provide text for a text message.');
      message = {
        type: 'text',
        text: ctx.input.text
      };
    } else {
      if (!ctx.input.attachmentType || !ctx.input.attachmentUrl)
        throw createApiServiceError(
          'Provide attachmentType and attachmentUrl for an attachment message.'
        );
      if (!/^https?:\/\//i.test(ctx.input.attachmentUrl))
        throw createApiServiceError('attachmentUrl must be an HTTP or HTTPS URL.');
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
