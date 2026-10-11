import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createMessengerClient } from '../lib/client';
import { messengerServiceError } from '../lib/errors';
import {
  messageTagSchema,
  messagingTypeSchema,
  replyToMessageIdSchema,
  validateMessagingPolicy
} from '../lib/messaging';
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
  description: `Send a text message or media attachment to a Messenger user. Supports plain text with optional quick reply buttons, media attachments (images, videos, audio, files) via URL or reusable attachment ID, multiple images, and replies to a specific earlier message.
Use **messagingType** and **tag** to send a human agent reply outside the 24-hour messaging window.`,
  instructions: [
    'The recipientId is the Page-Scoped User ID (PSID) of the recipient. Use List Conversations to find PSIDs of people who messaged the Page.',
    'Quick replies can only be attached to text messages.',
    'Set replyToMessageId to quote an earlier message from the conversation.',
    'For sending structured templates (carousels, buttons, receipts), use the Send Template tool instead.'
  ],
  constraints: [
    'Messages can only be sent within the standard messaging window (usually 24 hours after the person’s last message). Outside it, only the HUMAN_AGENT tag is accepted, within 7 days and with the Human Agent permission.',
    'Quick replies are limited to 13 items.',
    'Media fetched from a URL is limited to 8 MB for images and 25 MB for other files.'
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
        .describe(
          'Whether Messenger should save a URL attachment for reuse and return its attachment ID (IDs expire after 90 days)'
        ),
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
      replyToMessageId: replyToMessageIdSchema,
      messagingType: messagingTypeSchema,
      tag: messageTagSchema
    })
  )
  .output(
    z.object({
      recipientId: z.string().describe('PSID of the message recipient'),
      messageId: z.string().describe('ID of the sent message'),
      attachmentId: z
        .string()
        .optional()
        .describe(
          'Reusable attachment ID, returned when isReusable was set for a URL attachment'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = createMessengerClient(ctx);

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
        tag: ctx.input.tag,
        replyToMessageId: ctx.input.replyToMessageId
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
        tag: ctx.input.tag,
        replyToMessageId: ctx.input.replyToMessageId
      });
    } else {
      result = await client.sendTextMessage({
        recipientId: ctx.input.recipientId,
        text: ctx.input.text as string,
        quickReplies: ctx.input.quickReplies,
        messagingType: ctx.input.messagingType,
        tag: ctx.input.tag,
        replyToMessageId: ctx.input.replyToMessageId
      });
    }

    if (!result?.message_id) {
      throw messengerServiceError(
        'Messenger accepted the request but did not return a message ID'
      );
    }

    return {
      output: {
        recipientId: result.recipient_id ?? ctx.input.recipientId,
        messageId: result.message_id,
        ...(result.attachment_id ? { attachmentId: String(result.attachment_id) } : {})
      },
      message: `Message sent successfully to user **${result.recipient_id}** (message ID: ${result.message_id}).`
    };
  })
  .build();
