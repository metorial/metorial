import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a message across WhatsApp, Instagram, Telegram, or Messenger channels. Supports text messages, media messages (images, documents, audio, video), and template messages.
For WhatsApp, text and media messages require an active 24-hour session; template messages can be sent anytime. Messages can be scheduled for future delivery.`,
  instructions: [
    'For WhatsApp text/media messages, ensure there is an active 24-hour session with the contact.',
    'Use template messages to reach WhatsApp contacts outside the session window.',
    'Provide either contactId, clientId, or recipient (phoneNumber + name) to identify the recipient.'
  ],
  constraints: [
    'WhatsApp text and media messages can only be sent during an active 24-hour session.'
  ]
})
  .input(
    z.object({
      channel: z
        .enum(['whatsapp', 'telegram', 'instagram', 'messenger'])
        .describe('Messaging channel to send on'),
      messageType: z
        .enum(['sendtext', 'sendmedia', 'sendtemplate'])
        .describe('Type of message to send'),
      contactId: z.string().optional().describe('Contact ID to send to'),
      clientId: z.string().optional().describe('Client ID to send to'),
      phoneNumber: z
        .string()
        .optional()
        .describe('Recipient phone number (alternative to contactId/clientId)'),
      recipientName: z.string().optional().describe('Recipient name (used with phoneNumber)'),
      text: z.string().optional().describe('Text message content (for sendtext)'),
      mediaUrl: z.string().optional().describe('URL of media to send (for sendmedia)'),
      mediaType: z
        .string()
        .optional()
        .describe('Type of media: image, document, audio, video (for sendmedia)'),
      caption: z.string().optional().describe('Caption for media (for sendmedia)'),
      fileName: z.string().optional().describe('Filename for document media'),
      templateName: z.string().optional().describe('Template name (for sendtemplate)'),
      templateLanguage: z
        .string()
        .optional()
        .describe('Template language code (for sendtemplate)'),
      templateParameters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Template parameters (for sendtemplate)'),
      scheduleDateTime: z
        .string()
        .optional()
        .describe('ISO 8601 UTC datetime to schedule message delivery')
    })
  )
  .output(
    z.object({
      messageId: z.string().optional().describe('ID of the sent message'),
      success: z.boolean().describe('Whether the message was sent successfully'),
      status: z.string().optional().describe('Message delivery status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiHost: ctx.config.apiHost
    });

    let payload: Record<string, any> = {};

    if (ctx.input.contactId) {
      payload.contactId = ctx.input.contactId;
    } else if (ctx.input.clientId) {
      payload.clientId = ctx.input.clientId;
    } else if (ctx.input.phoneNumber) {
      payload.recipient = {
        phoneNumber: ctx.input.phoneNumber,
        name: ctx.input.recipientName
      };
    }

    if (ctx.input.messageType === 'sendtext') {
      payload.text = ctx.input.text;
    } else if (ctx.input.messageType === 'sendmedia') {
      payload.mediaUrl = ctx.input.mediaUrl;
      payload.mediaType = ctx.input.mediaType;
      if (ctx.input.caption) payload.caption = ctx.input.caption;
      if (ctx.input.fileName) payload.fileName = ctx.input.fileName;
    } else if (ctx.input.messageType === 'sendtemplate') {
      payload.templateName = ctx.input.templateName;
      payload.templateLanguage = ctx.input.templateLanguage;
      if (ctx.input.templateParameters) {
        Object.assign(payload, ctx.input.templateParameters);
      }
    }

    if (ctx.input.scheduleDateTime) {
      payload.scheduleDateTime = ctx.input.scheduleDateTime;
    }

    let result = await client.sendMessage(ctx.input.channel, ctx.input.messageType, payload);

    return {
      output: {
        messageId: result.id || result._id || result.messageId,
        success: true,
        status: result.status
      },
      message: `Sent **${ctx.input.messageType.replace('send', '')}** message on **${ctx.input.channel}**.`
    };
  })
  .build();
