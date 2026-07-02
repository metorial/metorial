import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let localizedStringSchema = z
  .record(z.string(), z.string())
  .describe('Localized strings keyed by language code, e.g. {"en": "Hello", "es": "Hola"}');

export let sendNotification = SlateTool.create(spec, {
  name: 'Send Notification',
  key: 'send_notification',
  description: `Send a push notification, email, or SMS/MMS message through OneSignal. Supports targeting by segments, user aliases, filters, subscription IDs, email addresses, or phone numbers. Can include rich content like images, action buttons, and custom data.`,
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
      // Targeting
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
      externalId: z.string().optional().describe('External ID if provided')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.config.appId
    });

    let body: Record<string, any> = {};

    // Targeting
    if (ctx.input.segments) body.included_segments = ctx.input.segments;
    if (ctx.input.aliases) body.include_aliases = ctx.input.aliases;
    if (ctx.input.filters) body.filters = ctx.input.filters;
    if (ctx.input.subscriptionIds) body.include_subscription_ids = ctx.input.subscriptionIds;
    if (ctx.input.emailAddresses) body.email_to = ctx.input.emailAddresses;
    if (ctx.input.phoneNumbers) body.include_phone_numbers = ctx.input.phoneNumbers;

    // Channel
    if (ctx.input.targetChannel) body.target_channel = ctx.input.targetChannel;

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
    if (ctx.input.emailReplyTo) body.email_reply_to = ctx.input.emailReplyTo;

    // SMS content
    if (ctx.input.smsFrom) body.sms_from = ctx.input.smsFrom;
    if (ctx.input.smsMediaUrls) body.sms_media_urls = ctx.input.smsMediaUrls;

    // Scheduling
    if (ctx.input.sendAfter) body.send_after = ctx.input.sendAfter;
    if (ctx.input.delayedOption) body.delayed_option = ctx.input.delayedOption;
    if (ctx.input.deliveryTimeOfDay) body.delivery_time_of_day = ctx.input.deliveryTimeOfDay;

    // Other
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
        externalId: result.external_id
      },
      message: result.id
        ? `Notification **${result.id}** sent successfully${result.recipients ? ` to ${result.recipients} recipient(s)` : ''}.`
        : 'Notification request submitted but no ID was returned (may indicate no valid recipients).'
    };
  })
  .build();
