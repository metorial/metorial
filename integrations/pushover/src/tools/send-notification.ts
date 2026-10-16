import { createApiServiceError, getBase64ByteLength, SlateTool } from 'slates';
import { z } from 'zod';
import { PushoverClient } from '../lib/client';
import { spec } from '../spec';

export let sendNotification = SlateTool.create(spec, {
  name: 'Send Notification',
  key: 'send_notification',
  description: `Send a push notification to a Pushover user or group. Supports message body, title, HTML/monospace formatting, supplementary URLs, custom sounds, image attachments (Base64), priority levels including emergency with retry/acknowledgement tracking, and time-to-live for auto-deletion.`,
  instructions: [
    'For emergency priority (2), you must provide **retry** (min 30 seconds) and **expire** (max 10800 seconds).',
    'Set **html** to true for HTML formatting or **monospace** to true for monospace — they cannot be combined.',
    'When using **attachmentBase64**, also provide **attachmentType** with the MIME type (e.g. `image/png`).'
  ],
  constraints: [
    'Message body is limited to 1024 characters.',
    'Title is limited to 250 characters.',
    'URL is limited to 512 characters, URL title to 100 characters.',
    'Image attachments are limited to 5 MB.',
    'The account shares a free monthly quota of 10,000 messages (25,000 for Teams); purchased capacity may increase this.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      message: z.string().describe('Notification message body (max 1024 characters)'),
      recipientKey: z
        .string()
        .optional()
        .describe(
          'User key, group key, or up to 50 comma-separated user keys. Defaults to the authenticated key. Call list_groups to discover owned groups.'
        ),
      title: z
        .string()
        .optional()
        .describe('Message title (max 250 characters). Defaults to app name.'),
      device: z
        .string()
        .optional()
        .describe(
          'One device name or comma-separated device names. Ignored for multiple users and non-Team groups; an invalid device name for a single user falls back to all devices.'
        ),
      priority: z
        .number()
        .min(-2)
        .max(2)
        .optional()
        .describe(
          'Priority level: -2 (silent), -1 (quiet), 0 (normal), 1 (high, bypasses quiet hours), 2 (emergency, repeats until acknowledged)'
        ),
      sound: z
        .string()
        .optional()
        .describe(
          'Notification sound name (e.g. pushover, bike, bugle, cashregister, cosmic, none)'
        ),
      timestamp: z
        .number()
        .optional()
        .describe(
          'Unix timestamp to display as the message time instead of the time received'
        ),
      html: z.boolean().optional().describe('Enable HTML formatting in the message body'),
      monospace: z
        .boolean()
        .optional()
        .describe('Enable monospace formatting in the message body'),
      url: z
        .string()
        .optional()
        .describe('Supplementary URL to include with the message (max 512 characters)'),
      urlTitle: z
        .string()
        .optional()
        .describe('Title for the supplementary URL (max 100 characters)'),
      ttl: z
        .number()
        .optional()
        .describe('Positive time to live in seconds. Ignored for emergency priority (2).'),
      retry: z
        .number()
        .min(30)
        .optional()
        .describe('Emergency priority only: retry interval in seconds (minimum 30)'),
      expire: z
        .number()
        .max(10800)
        .optional()
        .describe(
          'Emergency priority only: duration in seconds to keep retrying (maximum 10800)'
        ),
      callbackUrl: z
        .string()
        .optional()
        .describe(
          'Emergency priority only: URL to receive an HTTP POST when the notification is acknowledged'
        ),
      tags: z
        .string()
        .optional()
        .describe(
          'Emergency priority only: comma-separated tags for identifying/canceling receipts'
        ),
      attachmentBase64: z
        .string()
        .optional()
        .describe('Base64-encoded image attachment (max 5 MB)'),
      attachmentType: z
        .string()
        .optional()
        .describe(
          'MIME type of the attachment (e.g. image/png, image/jpeg). Required when using attachmentBase64.'
        )
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Unique request identifier'),
      receiptId: z
        .string()
        .optional()
        .describe(
          'Receipt ID for tracking emergency-priority message acknowledgement (only returned for priority=2)'
        )
    })
  )
  .handleInvocation(async ctx => {
    for (let [field, value] of [
      ['priority', ctx.input.priority],
      ['timestamp', ctx.input.timestamp],
      ['ttl', ctx.input.ttl],
      ['retry', ctx.input.retry],
      ['expire', ctx.input.expire]
    ] as const) {
      if (value !== undefined && !Number.isInteger(value)) {
        throw createApiServiceError(`${field} must be an integer.`);
      }
    }
    if (
      (ctx.input.ttl !== undefined && ctx.input.ttl <= 0) ||
      (ctx.input.expire !== undefined && ctx.input.expire <= 0)
    ) {
      throw createApiServiceError('ttl and expire must be positive numbers of seconds.');
    }
    if (ctx.input.html && ctx.input.monospace) {
      throw createApiServiceError('Choose either html or monospace formatting, not both.');
    }
    if (
      ctx.input.priority === 2 &&
      (ctx.input.retry === undefined || ctx.input.expire === undefined)
    ) {
      throw createApiServiceError('Emergency priority requires retry and expire values.');
    }
    if (
      ctx.input.priority !== 2 &&
      [ctx.input.retry, ctx.input.expire, ctx.input.callbackUrl, ctx.input.tags].some(
        value => value !== undefined
      )
    ) {
      throw createApiServiceError('retry, expire, callbackUrl, and tags require priority 2.');
    }
    for (let [field, value, limit] of [
      ['message', ctx.input.message, 1024],
      ['title', ctx.input.title, 250],
      ['url', ctx.input.url, 512],
      ['urlTitle', ctx.input.urlTitle, 100]
    ] as const) {
      if (value !== undefined && Array.from(value).length > limit) {
        throw createApiServiceError(`${field} must not exceed ${limit} characters.`);
      }
    }
    if (ctx.input.message.length === 0) {
      throw createApiServiceError('message must not be empty.');
    }
    let recipients = (ctx.input.recipientKey ?? ctx.auth.userKey).split(',');
    if (recipients.length > 50 || recipients.some(key => !/^[A-Za-z0-9]{30}$/.test(key))) {
      throw createApiServiceError(
        'Provide one user/group key or at most 50 comma-separated 30-character user keys without spaces.'
      );
    }
    if (ctx.input.attachmentBase64 !== undefined) {
      if (!ctx.input.attachmentType) {
        throw createApiServiceError('attachmentType is required with attachmentBase64.');
      }
      if (getBase64ByteLength(ctx.input.attachmentBase64) > 5_242_880) {
        throw createApiServiceError('The image must not exceed 5,242,880 bytes.');
      }
    } else if (ctx.input.attachmentType !== undefined) {
      throw createApiServiceError('Provide attachmentBase64 when setting attachmentType.');
    }
    if (ctx.input.callbackUrl !== undefined && !/^https?:\/\//i.test(ctx.input.callbackUrl)) {
      throw createApiServiceError(
        'callbackUrl must be a publicly accessible HTTP or HTTPS URL.'
      );
    }

    let client = new PushoverClient({
      token: ctx.auth.token,
      userKey: ctx.auth.userKey
    });

    let result = await client.sendMessage({
      message: ctx.input.message,
      user: ctx.input.recipientKey,
      title: ctx.input.title,
      device: ctx.input.device,
      priority: ctx.input.priority,
      sound: ctx.input.sound,
      timestamp: ctx.input.timestamp,
      html: ctx.input.html,
      monospace: ctx.input.monospace,
      url: ctx.input.url,
      urlTitle: ctx.input.urlTitle,
      ttl: ctx.input.ttl,
      retry: ctx.input.retry,
      expire: ctx.input.expire,
      callback: ctx.input.callbackUrl,
      tags: ctx.input.tags,
      attachmentBase64: ctx.input.attachmentBase64,
      attachmentType: ctx.input.attachmentType
    });

    let priorityLabel = '';
    switch (ctx.input.priority) {
      case -2:
        priorityLabel = 'silent';
        break;
      case -1:
        priorityLabel = 'quiet';
        break;
      case 0:
        priorityLabel = 'normal';
        break;
      case 1:
        priorityLabel = 'high';
        break;
      case 2:
        priorityLabel = 'emergency';
        break;
    }

    let message = `Notification sent successfully`;
    if (ctx.input.title) message += ` with title "${ctx.input.title}"`;
    if (priorityLabel) message += ` (${priorityLabel} priority)`;
    message += '.';
    if (result.receipt) message += ` Receipt ID: \`${result.receipt}\``;

    return {
      output: {
        requestId: result.request,
        receiptId: result.receipt
      },
      message
    };
  })
  .build();
