import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { appIdSchema } from '../lib/schemas';
import { spec } from '../spec';

let localizedStringSchema = z
  .record(z.string(), z.string())
  .describe('Localized strings keyed by language code, e.g. {"en": "Hello", "es": "Hola"}');

export let sendNotification = SlateTool.create(spec, {
  name: 'Send Notification',
  key: 'send_notification',
  description: `Send a push notification, email, or SMS/MMS message through OneSignal. Supports targeting by segments, user aliases, filters, subscription IDs, email addresses, or phone numbers. Can include rich content like images, action buttons, and custom data. Provide appId from list_apps with an Organization API Key, or Settings > Keys & IDs.`,
  instructions: [
    'Specify exactly one targeting method: segments, aliases, filters, subscriptionIds, emailAddresses, or phoneNumbers.',
    'For push notifications, provide "contents" with localized message body. For emails, provide "emailSubject" and "emailBody". For SMS, provide "contents" and optionally "smsFrom".',
    'Use "targetChannel" to explicitly set the channel when targeting methods could apply to multiple channels.'
  ],
  constraints: [
    'Maximum 20,000 entries for aliases, subscriptionIds, emailAddresses, or phoneNumbers.',
    'Maximum 200 filters per request.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      appId: appIdSchema,
      // Targeting
      excludedSegments: z
        .array(z.string())
        .optional()
        .describe('Segments to exclude when targeting segments'),
      segments: z
        .array(z.string())
        .optional()
        .describe('Target predefined segments, e.g. ["All", "Active Users"]'),
      aliases: z
        .record(z.string(), z.array(z.string()))
        .optional()
        .describe('Target by alias, e.g. {"external_id": ["user1", "user2"]}'),
      filters: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Custom audience filters with AND/OR logic'),
      subscriptionIds: z
        .array(z.string())
        .optional()
        .describe('Specific OneSignal subscription IDs to target'),
      emailAddresses: z
        .array(z.string())
        .optional()
        .describe('Direct email addresses to target'),
      phoneNumbers: z
        .array(z.string())
        .optional()
        .describe('E.164 format phone numbers to target'),

      // Channel
      targetChannel: z
        .enum(['push', 'email', 'sms'])
        .optional()
        .describe('Explicitly set the messaging channel'),

      // Push content
      contents: localizedStringSchema.optional(),
      headings: localizedStringSchema.optional(),
      subtitle: localizedStringSchema.optional(),
      customData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom key-value data payload'),
      buttons: z
        .array(
          z.object({
            id: z.string(),
            text: z.string(),
            icon: z.string().optional(),
            url: z.string().optional()
          })
        )
        .optional()
        .describe('Action buttons for push notifications'),
      bigPicture: z.string().optional().describe('URL to large image for Android push'),
      chromeWebImage: z.string().optional().describe('URL to image for web push'),
      iosAttachments: z
        .record(z.string(), z.string())
        .optional()
        .describe('iOS media attachments, e.g. {"id": "https://example.com/image.jpg"}'),

      // Email content
      emailSubject: z.string().optional().describe('Email subject line'),
      emailBody: z.string().optional().describe('HTML email body content'),
      emailPreheader: z.string().optional().describe('Email preview text'),
      emailFromName: z.string().optional().describe('Sender display name'),
      emailReplyTo: z.string().optional().describe('Reply-to email address'),

      // SMS content
      smsFrom: z.string().optional().describe('SMS sender identifier'),
      smsMediaUrls: z.array(z.string()).optional().describe('MMS media URLs'),

      // Scheduling
      sendAfter: z.string().optional().describe('ISO 8601 scheduled delivery time'),
      delayedOption: z
        .enum(['timezone', 'last-active'])
        .optional()
        .describe('Delivery optimization strategy'),
      deliveryTimeOfDay: z
        .string()
        .optional()
        .describe('Time of day for delivery, e.g. "9:00AM"'),

      // Other
      idempotencyKey: z
        .string()
        .optional()
        .describe(
          'RFC 9562 UUID, such as v4 or v7, used to deduplicate retries of this logical send for 30 days'
        ),
      throttleRatePerMinute: z
        .number()
        .optional()
        .describe('Push delivery rate; use 0 with delayedOption'),
      templateId: z.string().optional().describe('Template ID to use for message content'),
      name: z
        .string()
        .optional()
        .describe('Internal name for the message (not shown to recipients)'),
      collapseId: z.string().optional().describe('Collapse ID for message replacement'),
      priority: z.number().optional().describe('Delivery priority (10 = high)'),
      ttl: z.number().optional().describe('Time to live in seconds')
    })
  )
  .output(
    z.object({
      notificationId: z.string().optional().describe('ID of the created notification'),
      recipients: z.number().optional().describe('Number of recipients targeted'),
      externalId: z.string().optional().describe('External ID if provided'),
      errors: z
        .any()
        .optional()
        .describe(
          'Provider warnings or invalid audience details when the message was accepted'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.input.appId ?? ctx.config.appId
    });

    let targeting = [
      ctx.input.segments,
      ctx.input.aliases,
      ctx.input.filters,
      ctx.input.subscriptionIds,
      ctx.input.emailAddresses,
      ctx.input.phoneNumbers
    ];
    if (targeting.filter(value => value !== undefined).length !== 1) {
      throw createApiServiceError(
        'Specify exactly one targeting method: segments, aliases, filters, subscriptionIds, emailAddresses, or phoneNumbers.'
      );
    }
    for (let audience of targeting) {
      if (
        audience !== undefined &&
        (Array.isArray(audience) ? audience.length === 0 : Object.keys(audience).length === 0)
      ) {
        throw createApiServiceError(
          'The selected audience must contain at least one target or filter.'
        );
      }
    }
    for (let audience of [
      ctx.input.subscriptionIds,
      ctx.input.emailAddresses,
      ctx.input.phoneNumbers
    ]) {
      if (audience && audience.length > 20000)
        throw createApiServiceError('A direct audience can contain at most 20,000 entries.');
    }
    if (ctx.input.aliases) {
      let values = Object.values(ctx.input.aliases);
      if (
        values.some(ids => ids.length === 0) ||
        values.reduce((count, ids) => count + ids.length, 0) > 20000
      ) {
        throw createApiServiceError(
          'Aliases must contain non-empty ID lists with at most 20,000 IDs in total.'
        );
      }
      if (!ctx.input.targetChannel)
        throw createApiServiceError('Set targetChannel when targeting aliases.');
    }
    if (ctx.input.filters && ctx.input.filters.length > 200)
      throw createApiServiceError('Provide at most 200 filters and operators.');
    if (ctx.input.excludedSegments && !ctx.input.segments)
      throw createApiServiceError('excludedSegments can only be used with segments.');
    if (
      ctx.input.emailAddresses &&
      ctx.input.targetChannel &&
      ctx.input.targetChannel !== 'email'
    )
      throw createApiServiceError('emailAddresses requires the email channel.');
    if (ctx.input.phoneNumbers && ctx.input.targetChannel && ctx.input.targetChannel !== 'sms')
      throw createApiServiceError('phoneNumbers requires the sms channel.');
    let channel =
      ctx.input.targetChannel ??
      (ctx.input.emailAddresses ? 'email' : ctx.input.phoneNumbers ? 'sms' : 'push');
    if (
      !ctx.input.templateId &&
      (channel === 'email'
        ? !ctx.input.emailSubject || !ctx.input.emailBody
        : !ctx.input.contents?.en)
    ) {
      throw createApiServiceError(
        channel === 'email'
          ? 'Provide emailSubject and emailBody, or templateId.'
          : 'Provide contents with an English (en) message, or templateId.'
      );
    }
    if (ctx.input.delayedOption === 'timezone' && !ctx.input.deliveryTimeOfDay)
      throw createApiServiceError('Provide deliveryTimeOfDay with timezone delivery.');
    if (ctx.input.delayedOption && channel === 'sms')
      throw createApiServiceError('delayedOption is available for push and email only.');
    for (let [field, value] of Object.entries({
      priority: ctx.input.priority,
      ttl: ctx.input.ttl,
      throttleRatePerMinute: ctx.input.throttleRatePerMinute
    })) {
      if (value !== undefined && (!Number.isInteger(value) || value < 0))
        throw createApiServiceError(`${field} must be a non-negative integer.`);
    }
    if (ctx.input.ttl !== undefined && ctx.input.ttl > 2419200)
      throw createApiServiceError('ttl must be at most 2419200 seconds (28 days).');
    if (ctx.input.priority !== undefined && ![5, 10].includes(ctx.input.priority))
      throw createApiServiceError('priority must be 5 (normal) or 10 (high).');
    if (
      ctx.input.delayedOption &&
      ctx.input.throttleRatePerMinute !== undefined &&
      ctx.input.throttleRatePerMinute !== 0
    )
      throw createApiServiceError('Set throttleRatePerMinute to 0 with delayedOption.');
    if (
      ctx.input.idempotencyKey !== undefined &&
      !z.uuid().safeParse(ctx.input.idempotencyKey).success
    )
      throw createApiServiceError(
        'idempotencyKey must be an RFC 9562 UUID, such as v4 or v7.'
      );

    let body: Record<string, any> = {};

    // Targeting
    if (ctx.input.excludedSegments) body.excluded_segments = ctx.input.excludedSegments;
    if (ctx.input.segments) body.included_segments = ctx.input.segments;
    if (ctx.input.aliases) body.include_aliases = ctx.input.aliases;
    if (ctx.input.filters) body.filters = ctx.input.filters;
    if (ctx.input.subscriptionIds) body.include_subscription_ids = ctx.input.subscriptionIds;
    if (ctx.input.emailAddresses) body.email_to = ctx.input.emailAddresses;
    if (ctx.input.phoneNumbers) body.include_phone_numbers = ctx.input.phoneNumbers;

    // Channel
    body.target_channel = channel;

    // Push content
    if (ctx.input.contents) body.contents = ctx.input.contents;
    if (ctx.input.headings) body.headings = ctx.input.headings;
    if (ctx.input.subtitle) body.subtitle = ctx.input.subtitle;
    if (ctx.input.customData) body.data = ctx.input.customData;
    if (ctx.input.buttons) body.buttons = ctx.input.buttons;
    if (ctx.input.bigPicture) body.big_picture = ctx.input.bigPicture;
    if (ctx.input.chromeWebImage) body.chrome_web_image = ctx.input.chromeWebImage;
    if (ctx.input.iosAttachments) body.ios_attachments = ctx.input.iosAttachments;

    // Email content
    if (ctx.input.emailSubject) body.email_subject = ctx.input.emailSubject;
    if (ctx.input.emailBody) body.email_body = ctx.input.emailBody;
    if (ctx.input.emailPreheader) body.email_preheader = ctx.input.emailPreheader;
    if (ctx.input.emailFromName) body.email_from_name = ctx.input.emailFromName;
    if (ctx.input.emailReplyTo) body.email_reply_to_address = ctx.input.emailReplyTo;

    // SMS content
    if (ctx.input.smsFrom) body.sms_from = ctx.input.smsFrom;
    if (ctx.input.smsMediaUrls) body.sms_media_urls = ctx.input.smsMediaUrls;

    // Scheduling
    if (ctx.input.sendAfter) body.send_after = ctx.input.sendAfter;
    if (ctx.input.delayedOption) body.delayed_option = ctx.input.delayedOption;
    if (ctx.input.deliveryTimeOfDay) body.delivery_time_of_day = ctx.input.deliveryTimeOfDay;

    // Other
    if (ctx.input.idempotencyKey) body.idempotency_key = ctx.input.idempotencyKey;
    if (ctx.input.throttleRatePerMinute !== undefined || ctx.input.delayedOption)
      body.throttle_rate_per_minute = ctx.input.throttleRatePerMinute ?? 0;
    if (ctx.input.templateId) body.template_id = ctx.input.templateId;
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.collapseId) body.collapse_id = ctx.input.collapseId;
    if (ctx.input.priority !== undefined) body.priority = ctx.input.priority;
    if (ctx.input.ttl !== undefined) body.ttl = ctx.input.ttl;

    let result = await client.sendNotification(body);

    return {
      output: {
        notificationId: result.id,
        recipients: result.recipients,
        externalId: result.external_id ?? undefined,
        errors: result.errors
      },
      message: result.id
        ? `Notification **${result.id}** accepted for delivery${result.recipients ? ` to ${result.recipients} recipient(s)` : ''}.`
        : 'Notification request submitted but no ID was returned (may indicate no valid recipients).'
    };
  })
  .build();
