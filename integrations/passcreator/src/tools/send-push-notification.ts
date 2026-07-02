import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendPushNotification = SlateTool.create(spec, {
  name: 'Send Push Notification',
  key: 'send_push_notification',
  description: `Send a push notification to one or more passes. Notifications appear on the lock screen of devices where the pass is saved. Supports both single-pass and bulk (up to 500 passes) notifications. Can also schedule template-wide notifications for a future date.`,
  instructions: [
    'The notification text supports placeholders like {PropertyName} that resolve to pass field values.',
    'For bulk notifications, provide an array of pass IDs (max 500).',
    'For template-wide scheduled notifications, provide templateId and scheduledDate.'
  ],
  constraints: [
    'Bulk notifications are processed asynchronously (max 500 passes per request).',
    'Duplicate push notifications to the same pass within a short timeframe are prevented.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      notificationText: z
        .string()
        .describe('Push notification text. Supports {PropertyName} placeholders.'),
      passId: z.string().optional().describe('Single pass identifier to send notification to'),
      passIds: z
        .array(z.string())
        .optional()
        .describe('Array of pass identifiers for bulk notifications (max 500)'),
      templateId: z
        .string()
        .optional()
        .describe('Template identifier for scheduling a template-wide notification'),
      scheduledDate: z
        .string()
        .optional()
        .describe(
          'Date/time to schedule the notification in "Y-m-d H:i" format (requires templateId)'
        )
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the notification was sent/scheduled successfully'),
      notificationId: z
        .string()
        .optional()
        .describe('Notification ID for scheduled template notifications')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    // Template-wide scheduled notification
    if (ctx.input.templateId) {
      let result = await client.scheduleTemplateNotification(ctx.input.templateId, {
        pushNotificationText: ctx.input.notificationText,
        publicationDate: ctx.input.scheduledDate
      });
      return {
        output: {
          sent: true,
          notificationId: result.notificationId
        },
        message: ctx.input.scheduledDate
          ? `Scheduled notification for template \`${ctx.input.templateId}\` at ${ctx.input.scheduledDate}.`
          : `Sent notification to all passes in template \`${ctx.input.templateId}\`.`
      };
    }

    // Bulk notification
    if (ctx.input.passIds && ctx.input.passIds.length > 0) {
      await client.sendBulkPushNotifications(ctx.input.passIds, ctx.input.notificationText);
      return {
        output: { sent: true },
        message: `Queued push notification to **${ctx.input.passIds.length}** pass(es).`
      };
    }

    // Single pass notification
    if (ctx.input.passId) {
      await client.sendPushNotification(ctx.input.passId, ctx.input.notificationText);
      return {
        output: { sent: true },
        message: `Sent push notification to pass \`${ctx.input.passId}\`.`
      };
    }

    return {
      output: { sent: false },
      message: 'No target specified. Provide passId, passIds, or templateId.'
    };
  })
  .build();
