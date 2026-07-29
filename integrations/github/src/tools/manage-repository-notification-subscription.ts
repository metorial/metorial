import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import {
  GitHubNotificationsClient,
  mapNotificationSubscriptionState,
  notificationSubscriptionStateSchema
} from '../lib/github-notifications';
import { spec } from '../spec';

const actionSchema = z.enum(['ignore', 'watch', 'delete']);

export const manageRepositoryNotificationSubscription = SlateTool.create(spec, {
  name: 'Manage Repository Notification Subscription',
  key: 'manage_repository_notification_subscription',
  description:
    'Manage notification subscription settings for a GitHub repository. Watch subscribes to updates, ignore mutes repository notifications, and delete removes the current subscription.',
  tags: { destructive: true }
})
  .scopes(anyOf('notifications'))
  .input(
    z.object({
      owner: z.string().describe('The account owner of the repository'),
      repo: z.string().describe('The name of the repository'),
      action: actionSchema.describe(
        'Action to perform: delete, ignore, or watch the repository notification subscription'
      )
    })
  )
  .output(
    z.object({
      owner: z.string(),
      repo: z.string(),
      repositoryHtmlUrl: z.string(),
      action: actionSchema,
      deleted: z.boolean(),
      subscription: notificationSubscriptionStateSchema.nullable()
    })
  )
  .handleInvocation(async ctx => {
    const client = new GitHubNotificationsClient(ctx.auth);
    const result = await client.manageRepositoryNotificationSubscription(
      ctx.input.owner,
      ctx.input.repo,
      ctx.input.action
    );
    const subscription =
      ctx.input.action === 'delete'
        ? null
        : mapNotificationSubscriptionState(result, ctx.input.action);

    return {
      output: {
        owner: ctx.input.owner,
        repo: ctx.input.repo,
        repositoryHtmlUrl: client.getRepositoryHtmlUrl(ctx.input.owner, ctx.input.repo),
        action: ctx.input.action,
        deleted: ctx.input.action === 'delete',
        subscription
      },
      message: `Set **${ctx.input.owner}/${ctx.input.repo}** notification subscription action to **${ctx.input.action}**.`
    };
  })
  .build();
