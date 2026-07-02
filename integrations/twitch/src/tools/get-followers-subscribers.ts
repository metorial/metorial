import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwitchClient } from '../lib/client';
import { spec } from '../spec';

export let getFollowersSubscribers = SlateTool.create(spec, {
  name: 'Get Followers & Subscribers',
  key: 'get_followers_subscribers',
  description: `Retrieve a channel's follower list, subscriber list, or check a specific user's follow/subscription status. Returns totals and individual user details with dates and subscription tiers.`,
  instructions: [
    'Use **type** "followers" or "subscribers" to choose which list to retrieve.',
    'Provide **checkUserId** to check if a specific user follows/subscribes.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      broadcasterId: z.string().describe('Broadcaster user ID'),
      type: z
        .enum(['followers', 'subscribers'])
        .describe('Whether to get followers or subscribers'),
      checkUserId: z
        .string()
        .optional()
        .describe('Specific user ID to check follow/subscription status for'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum results to return (default 20, max 100)'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total count of followers or subscribers'),
      followers: z
        .array(
          z.object({
            userId: z.string(),
            userLogin: z.string(),
            userName: z.string(),
            followedAt: z.string()
          })
        )
        .optional(),
      subscribers: z
        .array(
          z.object({
            userId: z.string(),
            userLogin: z.string(),
            userName: z.string(),
            tier: z.string().describe('Subscription tier (1000, 2000, 3000)'),
            planName: z.string(),
            isGift: z.boolean(),
            gifterId: z.string().optional(),
            gifterName: z.string().optional()
          })
        )
        .optional(),
      cursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitchClient(ctx.auth.token, ctx.auth.clientId);

    if (ctx.input.type === 'followers') {
      let result = await client.getFollowers(ctx.input.broadcasterId, {
        userId: ctx.input.checkUserId,
        first: ctx.input.maxResults,
        after: ctx.input.cursor
      });

      let followers = result.followers.map(f => ({
        userId: f.user_id,
        userLogin: f.user_login,
        userName: f.user_name,
        followedAt: f.followed_at
      }));

      return {
        output: { total: result.total, followers, cursor: result.cursor },
        message: ctx.input.checkUserId
          ? followers.length > 0
            ? `User \`${ctx.input.checkUserId}\` follows this channel`
            : `User \`${ctx.input.checkUserId}\` does not follow this channel`
          : `Channel has **${result.total}** followers. Returned ${followers.length} results.`
      };
    }

    let result = await client.getSubscriptions(ctx.input.broadcasterId, {
      userIds: ctx.input.checkUserId ? [ctx.input.checkUserId] : undefined,
      first: ctx.input.maxResults,
      after: ctx.input.cursor
    });

    let subscribers = result.subscriptions.map(s => ({
      userId: s.user_id,
      userLogin: s.user_login,
      userName: s.user_name,
      tier: s.tier,
      planName: s.plan_name,
      isGift: s.is_gift,
      gifterId: s.gifter_id || undefined,
      gifterName: s.gifter_name || undefined
    }));

    return {
      output: { total: result.total, subscribers, cursor: result.cursor },
      message: ctx.input.checkUserId
        ? subscribers.length > 0 && subscribers[0]
          ? `User \`${ctx.input.checkUserId}\` is subscribed (Tier ${subscribers[0].tier})`
          : `User \`${ctx.input.checkUserId}\` is not subscribed`
        : `Channel has **${result.total}** subscribers. Returned ${subscribers.length} results.`
    };
  })
  .build();
