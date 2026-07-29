import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubNotificationsClient } from '../lib/github-notifications';
import { spec } from '../spec';

export const dismissNotification = SlateTool.create(spec, {
  name: 'Dismiss Notification',
  key: 'dismiss_notification',
  description:
    'Dismiss a GitHub notification by marking its thread as read or done. Marking it done removes the thread from the notification inbox.',
  tags: { destructive: true }
})
  .scopes(anyOf('notifications'))
  .input(
    z.object({
      threadID: z.string().describe('The ID of the notification thread'),
      state: z
        .enum(['read', 'done'])
        .describe('The new state of the notification: read or done')
    })
  )
  .output(
    z.object({
      threadID: z.string(),
      state: z.enum(['read', 'done'])
    })
  )
  .handleInvocation(async ctx => {
    const client = new GitHubNotificationsClient(ctx.auth);
    await client.dismissNotification(ctx.input.threadID, ctx.input.state);

    return {
      output: {
        threadID: ctx.input.threadID,
        state: ctx.input.state
      },
      message: `Marked GitHub notification **${ctx.input.threadID}** as **${ctx.input.state}**.`
    };
  })
  .build();
