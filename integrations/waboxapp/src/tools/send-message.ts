import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendMessageTool = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a WhatsApp message to a recipient. Supports sending plain text, images, links with rich preview, and media files (documents, PDFs, etc.).
Set the **messageType** to choose the content type. Text messages require the **text** field; image, link, and media messages require the **url** field and support optional preview metadata.`,
  instructions: [
    'Phone numbers must include the international country code without the + prefix (e.g., 34666123456 for Spain).',
    'Each message requires a unique customMessageId for delivery tracking via acknowledgement events.',
    'The linked WhatsApp account and Chrome extension must be online for messages to be delivered.'
  ],
  constraints: [
    'Image, link, and media URLs must be publicly accessible.',
    'Media files are limited by WhatsApp file size restrictions.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      recipientPhone: z
        .string()
        .describe(
          'Recipient WhatsApp phone number with international country code, no + prefix (e.g., 34666789123).'
        ),
      customMessageId: z
        .string()
        .describe(
          'A unique identifier for this message, used for delivery tracking via ACK webhook events.'
        ),
      messageType: z
        .enum(['text', 'image', 'link', 'media'])
        .describe('Type of message to send.'),
      text: z
        .string()
        .optional()
        .describe('Message text content. Required when messageType is "text".'),
      url: z
        .string()
        .optional()
        .describe(
          'Publicly accessible URL of the content to send. Required when messageType is "image", "link", or "media".'
        ),
      caption: z
        .string()
        .optional()
        .describe('Caption text displayed with the image, link, or media file.'),
      description: z
        .string()
        .optional()
        .describe('Description text for the link or media preview.'),
      thumbnailUrl: z
        .string()
        .optional()
        .describe('URL of a thumbnail image for the link or media preview.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the message was sent successfully.'),
      response: z.any().describe('Raw response from the Waboxapp API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      phoneNumber: ctx.auth.phoneNumber
    });

    let result: any;
    let messageType = ctx.input.messageType;

    switch (messageType) {
      case 'text': {
        if (!ctx.input.text) {
          throw new Error('Text content is required for text messages.');
        }
        result = await client.sendChat({
          to: ctx.input.recipientPhone,
          customUid: ctx.input.customMessageId,
          text: ctx.input.text
        });
        break;
      }
      case 'image': {
        if (!ctx.input.url) {
          throw new Error('Image URL is required for image messages.');
        }
        result = await client.sendImage({
          to: ctx.input.recipientPhone,
          customUid: ctx.input.customMessageId,
          url: ctx.input.url,
          caption: ctx.input.caption,
          description: ctx.input.description
        });
        break;
      }
      case 'link': {
        if (!ctx.input.url) {
          throw new Error('Link URL is required for link messages.');
        }
        result = await client.sendLink({
          to: ctx.input.recipientPhone,
          customUid: ctx.input.customMessageId,
          url: ctx.input.url,
          caption: ctx.input.caption,
          description: ctx.input.description,
          urlThumb: ctx.input.thumbnailUrl
        });
        break;
      }
      case 'media': {
        if (!ctx.input.url) {
          throw new Error('File URL is required for media messages.');
        }
        result = await client.sendMedia({
          to: ctx.input.recipientPhone,
          customUid: ctx.input.customMessageId,
          url: ctx.input.url,
          caption: ctx.input.caption,
          description: ctx.input.description,
          urlThumb: ctx.input.thumbnailUrl
        });
        break;
      }
    }

    return {
      output: {
        success: true,
        response: result
      },
      message: `Sent **${messageType}** message to **${ctx.input.recipientPhone}** (tracking ID: ${ctx.input.customMessageId}).`
    };
  })
  .build();
