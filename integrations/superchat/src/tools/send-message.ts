import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuperchatClient } from '../lib/client';
import { spec } from '../spec';

let textContent = z
  .object({
    type: z.literal('text').describe('Message type'),
    body: z.string().describe('The text message body')
  })
  .describe('Plain text message content');

let emailContent = z
  .object({
    type: z.literal('email').describe('Message type'),
    subject: z.string().optional().describe('Email subject line'),
    body: z.string().describe('Email body content')
  })
  .describe('Email message content');

let whatsAppTemplateContent = z
  .object({
    type: z.literal('whats_app_template').describe('Message type'),
    template_name: z.string().describe('Name of the approved WhatsApp template'),
    template_language: z.string().describe('Language code of the template (e.g., "en")'),
    template_variables: z
      .array(z.string())
      .optional()
      .describe('Template placeholder values in order')
  })
  .describe('WhatsApp template message content');

let genericTemplateContent = z
  .object({
    type: z.literal('generic_template').describe('Message type'),
    template_name: z.string().describe('Name of the generic template'),
    template_variables: z
      .array(z.string())
      .optional()
      .describe('Template placeholder values in order')
  })
  .describe('Generic template message content');

let mediaContent = z
  .object({
    type: z.literal('media').describe('Message type'),
    media_url: z.string().describe('URL of the media file to send'),
    caption: z.string().optional().describe('Caption for the media')
  })
  .describe('Media message content (image, video, document)');

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a message through any connected Superchat channel (WhatsApp, Instagram, Facebook Messenger, Telegram, Email, SMS). Supports text, email, WhatsApp templates, generic templates, and media content types. If the recipient doesn't exist as a contact yet, one will be created automatically.`,
  instructions: [
    'Use a channel ID from your connected channels in the "channelId" field.',
    'For WhatsApp out-of-window messaging (no message in the last 24 hours), use a WhatsApp template content type.',
    'Phone numbers must be in E164 format (e.g., +4915112345678).',
    'For email replies, set inReplyTo to the original message ID.'
  ],
  constraints: [
    'WhatsApp enforces a 24-hour messaging window for free-form messages. Outside that window, you must use a WhatsApp template.',
    'SMS messages can only contain text content or links.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      recipientIdentifier: z
        .string()
        .describe(
          'Recipient identifier: email address, phone number in E164 format, or an existing contact ID'
        ),
      channelId: z.string().describe('ID of the channel to send the message from'),
      senderName: z.string().optional().describe('Display name of the sender'),
      content: z
        .union([
          textContent,
          emailContent,
          whatsAppTemplateContent,
          genericTemplateContent,
          mediaContent
        ])
        .describe('Message content to send'),
      inReplyTo: z
        .string()
        .optional()
        .describe('Message ID to reply to (used for email threading)')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the sent message'),
      messageUrl: z.string().describe('Resource URL of the message'),
      createdAt: z.string().describe('Timestamp when the message was created'),
      status: z.string().describe('Delivery status of the message'),
      direction: z.string().describe('Message direction (outbound)'),
      conversationId: z.string().describe('ID of the conversation this message belongs to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });

    let result = await client.sendMessage({
      to: [{ identifier: ctx.input.recipientIdentifier }],
      from: {
        channelId: ctx.input.channelId,
        name: ctx.input.senderName
      },
      content: ctx.input.content,
      inReplyTo: ctx.input.inReplyTo
    });

    return {
      output: {
        messageId: result.id,
        messageUrl: result.url,
        createdAt: result.created_at,
        status: result.status,
        direction: result.direction,
        conversationId: result.conversation_id
      },
      message: `Message sent successfully via **${ctx.input.content.type}** to \`${ctx.input.recipientIdentifier}\`. Status: **${result.status}**. Conversation ID: \`${result.conversation_id}\`.`
    };
  })
  .build();
