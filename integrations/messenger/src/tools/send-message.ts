import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { messengerServiceError } from '../lib/errors';
import { spec } from '../spec';

let isHttpsUrl = (value: string) => /^https:\/\//i.test(value);

let quickReplySchema = z
  .object({
    contentType: z
      .enum(['text', 'user_phone_number', 'user_email'])
      .describe('Type of quick reply'),
    title: z
      .string()
      .max(20)
      .optional()
      .describe(
        'Title shown on the quick reply button (required for text type, max 20 chars)'
      ),
    payload: z
      .string()
      .max(1000)
      .optional()
      .describe(
        'Custom data sent back when the quick reply is tapped (required for text type, max 1000 chars)'
      ),
    imageUrl: z
      .string()
      .optional()
      .describe('URL of an image to display on the quick reply button')
  })
  .describe('A quick reply option presented to the user');

let validateMessagingPolicy = (messagingType: string, tag?: string) => {
  if (messagingType === 'MESSAGE_TAG' && !tag) {
    throw messengerServiceError('tag is required when messagingType is MESSAGE_TAG');
  }

  if (tag && messagingType !== 'MESSAGE_TAG') {
    throw messengerServiceError('tag can only be used when messagingType is MESSAGE_TAG');
  }
};

let validateQuickReplies = (
  quickReplies?: Array<{ contentType: string; title?: string; payload?: string }>
) => {
  for (let quickReply of quickReplies || []) {
    if (quickReply.contentType === 'text' && (!quickReply.title || !quickReply.payload)) {
      throw messengerServiceError('title and payload are required for text quick replies');
    }
  }
};

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a text message or media attachment to a Messenger user. Supports plain text with optional quick reply buttons, and media attachments (images, videos, audio, files) via URL.
Use **messagingType** and **tag** to send messages outside the 24-hour messaging window.`,
  instructions: [
    'The recipientId is the Page-Scoped User ID (PSID) of the recipient.',
    'Quick replies can only be attached to text messages.',
    'For sending structured templates (carousels, buttons, receipts), use the Send Template tool instead.'
  ],
  constraints: [
    'Messages can only be sent to users who have initiated a conversation within the last 24 hours, unless a message tag is used.',
    'Quick replies are limited to 13 items.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      recipientId: z.string().describe('Page-Scoped User ID (PSID) of the message recipient'),
      text: z
        .string()
        .max(2000)
        .optional()
        .describe(
          'Text content of the message (max 2000 characters). Required if attachmentType is not set.'
        ),
      attachmentType: z
        .enum(['image', 'video', 'audio', 'file'])
        .optional()
        .describe('Type of media attachment to send. Required if text is not set.'),
      attachmentUrl: z
        .string()
        .refine(isHttpsUrl, 'attachmentUrl must be a public HTTPS URL')
        .optional()
        .describe(
          'URL of the media attachment to send. Required when attachmentType is set unless attachmentId is provided.'
        ),
      attachmentId: z
        .string()
        .optional()
        .describe(
          'Reusable attachment ID returned by Upload Attachment. Alternative to attachmentUrl.'
        ),
      isReusable: z
        .boolean()
        .optional()
        .describe('Whether the attachment can be reused in future messages'),
      imageUrls: z
        .array(z.string().refine(isHttpsUrl, 'Each image URL must be a public HTTPS URL'))
        .min(2)
        .max(30)
        .optional()
        .describe(
          'Send 2 to 30 image URLs in one message using the multi-image Send API payload.'
        ),
      quickReplies: z
        .array(quickReplySchema)
        .max(13)
        .optional()
        .describe('Quick reply buttons to display (only for text messages)'),
      messagingType: z
        .enum(['RESPONSE', 'UPDATE', 'MESSAGE_TAG'])
        .default('RESPONSE')
        .describe(
          'The messaging type: RESPONSE (reply to user message), UPDATE (proactive update), MESSAGE_TAG (outside 24h window)'
        ),
      tag: z
        .enum([
          'CONFIRMED_EVENT_UPDATE',
          'POST_PURCHASE_UPDATE',
          'ACCOUNT_UPDATE',
          'HUMAN_AGENT'
        ])
        .optional()
        .describe(
          'Message tag for sending outside the 24-hour window. Required when messagingType is MESSAGE_TAG.'
        )
    })
  )
  .output(
    z.object({
      recipientId: z.string().describe('PSID of the message recipient'),
      messageId: z.string().describe('ID of the sent message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      pageId: ctx.config.pageId,
      apiVersion: ctx.config.apiVersion
    });

    let result: any;
    let hasText = typeof ctx.input.text === 'string' && ctx.input.text.length > 0;
    let hasAttachment = Boolean(ctx.input.attachmentType);
    let hasImageUrls = Boolean(ctx.input.imageUrls);
    let contentKinds = [hasText, hasAttachment, hasImageUrls].filter(Boolean).length;

    if (contentKinds !== 1) {
      throw messengerServiceError('Provide exactly one of text, attachmentType, or imageUrls');
    }

    validateMessagingPolicy(ctx.input.messagingType, ctx.input.tag);

    if (ctx.input.quickReplies && !hasText) {
      throw messengerServiceError('quickReplies can only be used with text messages');
    }

    validateQuickReplies(ctx.input.quickReplies);

    if (ctx.input.imageUrls) {
      result = await client.sendImageAttachments({
        recipientId: ctx.input.recipientId,
        imageUrls: ctx.input.imageUrls,
        messagingType: ctx.input.messagingType,
        tag: ctx.input.tag
      });
    } else if (ctx.input.attachmentType) {
      if (Boolean(ctx.input.attachmentUrl) === Boolean(ctx.input.attachmentId)) {
        throw messengerServiceError(
          'Provide exactly one of attachmentUrl or attachmentId when attachmentType is set'
        );
      }

      result = await client.sendAttachment({
        recipientId: ctx.input.recipientId,
        attachmentType: ctx.input.attachmentType,
        attachmentUrl: ctx.input.attachmentUrl,
        attachmentId: ctx.input.attachmentId,
        isReusable: ctx.input.isReusable,
        messagingType: ctx.input.messagingType,
        tag: ctx.input.tag
      });
    } else {
      result = await client.sendTextMessage({
        recipientId: ctx.input.recipientId,
        text: ctx.input.text as string,
        quickReplies: ctx.input.quickReplies,
        messagingType: ctx.input.messagingType,
        tag: ctx.input.tag
      });
    }

    return {
      output: {
        recipientId: result.recipient_id,
        messageId: result.message_id
      },
      message: `Message sent successfully to user **${result.recipient_id}** (message ID: ${result.message_id}).`
    };
  })
  .build();
