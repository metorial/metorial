import { SlateTool } from 'slates';
import { z } from 'zod';
import { MagneticClient } from '../lib/client';
import { spec } from '../spec';

let notificationSchema = z.object({
  notificationId: z.string().describe('ID of the notification'),
  message: z.string().optional().describe('Notification message text'),
  type: z.string().optional().describe('Type of notification'),
  createdDate: z.string().optional().describe('Date the notification was created'),
  read: z.boolean().optional().describe('Whether the notification has been read')
});

export let getNotifications = SlateTool.create(spec, {
  name: 'Get Notifications',
  key: 'get_notifications',
  description: `Retrieve notifications from Magnetic. Can fetch all notifications or only new/unread ones.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      newOnly: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, only return new/unread notifications')
    })
  )
  .output(
    z.object({
      notifications: z.array(notificationSchema).describe('List of notifications'),
      totalCount: z.number().describe('Number of notifications returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MagneticClient({ token: ctx.auth.token });

    let results = await client.getNotifications(ctx.input.newOnly);

    let notifications = (results || []).map((n: any) => ({
      notificationId: String(n.id),
      message: n.message,
      type: n.type,
      createdDate: n.createdDate ? String(n.createdDate) : undefined,
      read: n.read
    }));

    return {
      output: {
        notifications,
        totalCount: notifications.length
      },
      message: `Retrieved **${notifications.length}** notification${notifications.length === 1 ? '' : 's'}${ctx.input.newOnly ? ' (new only)' : ''}.`
    };
  })
  .build();
