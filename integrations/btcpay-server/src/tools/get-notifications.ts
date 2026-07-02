import { SlateTool } from 'slates';
import { z } from 'zod';
import { BTCPayClient } from '../lib/client';
import { spec } from '../spec';

export let getNotifications = SlateTool.create(spec, {
  name: 'Get Notifications',
  key: 'get_notifications',
  description: `Retrieve in-app notifications for the authenticated user. Covers events like invoice status changes, payouts, and version updates. Can filter by read/unread status and mark notifications as read.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'mark_read', 'delete'])
        .optional()
        .default('list')
        .describe('Action to perform'),
      notificationId: z
        .string()
        .optional()
        .describe('Notification ID (for mark_read, delete)'),
      seen: z.boolean().optional().describe('Filter by seen status (for list)'),
      take: z.number().optional().describe('Number of notifications to return'),
      skip: z.number().optional().describe('Number to skip for pagination')
    })
  )
  .output(
    z.object({
      notifications: z
        .array(
          z.object({
            notificationId: z.string().describe('Notification ID'),
            body: z.string().optional().describe('Notification body text'),
            link: z.string().optional().nullable().describe('Notification link'),
            seen: z.boolean().optional().describe('Whether the notification has been seen'),
            createdTime: z.string().optional().describe('Notification creation time')
          })
        )
        .optional()
        .describe('List of notifications'),
      markedRead: z.boolean().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BTCPayClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    if (ctx.input.action === 'mark_read') {
      await client.markNotificationRead(ctx.input.notificationId!);
      return {
        output: { markedRead: true },
        message: `Marked notification **${ctx.input.notificationId}** as read.`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteNotification(ctx.input.notificationId!);
      return {
        output: { deleted: true },
        message: `Deleted notification **${ctx.input.notificationId}**.`
      };
    }

    let notifications = await client.getNotifications({
      seen: ctx.input.seen,
      take: ctx.input.take,
      skip: ctx.input.skip
    });

    let mapped = notifications.map(n => ({
      notificationId: n.id as string,
      body: n.body as string | undefined,
      link: n.link as string | undefined,
      seen: n.seen as boolean | undefined,
      createdTime: n.createdTime !== undefined ? String(n.createdTime) : undefined
    }));

    return {
      output: { notifications: mapped },
      message: `Found **${mapped.length}** notification(s).`
    };
  })
  .build();
