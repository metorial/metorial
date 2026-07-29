import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import {
  GitHubNotificationsClient,
  mapGitHubNotification,
  notificationSchema
} from '../lib/github-notifications';
import { spec } from '../spec';

export const getNotificationDetails = SlateTool.create(spec, {
  name: 'Get Notification Details',
  key: 'get_notification_details',
  description:
    'Get detailed information for a specific GitHub notification. List notifications first when the notification ID is unknown.',
  tags: { readOnly: true }
})
  .scopes(anyOf('notifications'))
  .input(
    z.object({
      notificationID: z.string().describe('The ID of the notification')
    })
  )
  .output(
    z.object({
      notification: notificationSchema
    })
  )
  .handleInvocation(async ctx => {
    const client = new GitHubNotificationsClient(ctx.auth);
    const notification = mapGitHubNotification(
      await client.getNotificationDetails(ctx.input.notificationID)
    );

    return {
      output: { notification },
      message: `Retrieved GitHub notification **${notification.notificationID}**.`
    };
  })
  .build();
