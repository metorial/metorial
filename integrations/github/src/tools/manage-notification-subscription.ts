import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import {
  GitHubNotificationsClient,
  mapNotificationSubscriptionState,
  notificationSubscriptionStateSchema
} from '../lib/github-notifications';
import { spec } from '../spec';

const actionSchema = z.enum(['ignore', 'watch', 'delete']);

export const manageNotificationSubscription = SlateTool.create(spec, {
  name: 'Manage Notification Subscription',
  key: 'manage_notification_subscription',
  description:
    'Manage a GitHub notification thread subscription. Watch subscribes to updates, ignore mutes the thread, and delete removes the current subscription.',
  tags: { destructive: true }
})
  .scopes(anyOf('notifications'))
  .input(
    z.object({
      notificationID: z.string().describe('The ID of the notification thread'),
      action: actionSchema.describe(
        'Action to perform: delete, ignore, or watch the notification subscription'
      )
    })
  )
  .output(
    z.object({
      notificationID: z.string(),
      action: actionSchema,
      deleted: z.boolean(),
      subscription: notificationSubscriptionStateSchema.nullable()
    })
  )
  .handleInvocation(async ctx => {
    const client = new GitHubNotificationsClient(ctx.auth);
    const result = await client.manageNotificationSubscription(
      ctx.input.notificationID,
      ctx.input.action
    );
    const subscription =
      ctx.input.action === 'delete'
        ? null
        : mapNotificationSubscriptionState(result, ctx.input.action);

    return {
      output: {
        notificationID: ctx.input.notificationID,
        action: ctx.input.action,
        deleted: ctx.input.action === 'delete',
        subscription
      },
      message: `Set notification **${ctx.input.notificationID}** subscription action to **${ctx.input.action}**.`
    };
  })
  .build();
