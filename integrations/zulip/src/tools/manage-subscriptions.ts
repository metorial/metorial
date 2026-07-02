import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSubscriptions = SlateTool.create(spec, {
  name: 'Manage Subscriptions',
  key: 'manage_subscriptions',
  description: `Subscribe or unsubscribe users to/from Zulip channels. Can manage subscriptions for the authenticated user or other users (admin only).`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['subscribe', 'unsubscribe'])
        .describe('Whether to subscribe or unsubscribe'),
      channelNames: z.array(z.string()).describe('Names of channels to subscribe/unsubscribe'),
      userIds: z
        .array(z.number())
        .optional()
        .describe(
          'User IDs to subscribe/unsubscribe. If omitted, applies to the authenticated user'
        )
    })
  )
  .output(
    z.object({
      subscribed: z
        .record(z.string(), z.array(z.string()))
        .optional()
        .describe('Map of user emails to channels they were subscribed to'),
      alreadySubscribed: z
        .record(z.string(), z.array(z.string()))
        .optional()
        .describe('Map of user emails to channels they were already subscribed to'),
      removed: z
        .array(z.string())
        .optional()
        .describe('Channels successfully unsubscribed from'),
      notRemoved: z
        .array(z.string())
        .optional()
        .describe('Channels that could not be unsubscribed from')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      serverUrl: ctx.auth.serverUrl,
      email: ctx.auth.email,
      token: ctx.auth.token
    });

    if (ctx.input.action === 'subscribe') {
      let subscriptions = ctx.input.channelNames.map(name => ({ name }));
      let result = await client.subscribe({
        subscriptions,
        principals: ctx.input.userIds
      });

      return {
        output: {
          subscribed: result.subscribed,
          alreadySubscribed: result.already_subscribed
        },
        message: `Subscription update completed for ${ctx.input.channelNames.length} channel(s)`
      };
    } else {
      let result = await client.unsubscribe({
        subscriptions: ctx.input.channelNames,
        principals: ctx.input.userIds
      });

      return {
        output: {
          removed: result.removed,
          notRemoved: result.not_removed
        },
        message: `Unsubscribed from ${result.removed?.length ?? 0} channel(s)`
      };
    }
  })
  .build();
