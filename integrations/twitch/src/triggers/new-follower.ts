import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { TwitchClient } from '../lib/client';
import { spec } from '../spec';

export let newFollower = SlateTrigger.create(spec, {
  name: 'New Follower',
  key: 'new_follower',
  description:
    'Triggers when the authenticated broadcaster gains a new follower. Polls the followers endpoint for new entries.'
})
  .input(
    z.object({
      userId: z.string().describe('Follower user ID'),
      userLogin: z.string().describe('Follower login name'),
      userName: z.string().describe('Follower display name'),
      followedAt: z.string().describe('When the user followed')
    })
  )
  .output(
    z.object({
      followerId: z.string().describe('Follower user ID'),
      followerLogin: z.string().describe('Follower login name'),
      followerName: z.string().describe('Follower display name'),
      followedAt: z.string().describe('When the user followed'),
      broadcasterId: z.string().describe('The broadcaster who was followed')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new TwitchClient(ctx.auth.token, ctx.auth.clientId);
      let state = ctx.state as { lastFollowedAt?: string; broadcasterId?: string } | null;

      let user = await client.getAuthenticatedUser();
      let broadcasterId = user.id;

      let result = await client.getFollowers(broadcasterId, { first: 20 });

      let lastFollowedAt = state?.lastFollowedAt;
      let newFollowers = lastFollowedAt
        ? result.followers.filter(f => f.followed_at > lastFollowedAt)
        : [];

      // On first run, just record the latest timestamp without emitting events
      let newestFollowedAt =
        result.followers.length > 0 && result.followers[0]
          ? result.followers[0].followed_at
          : lastFollowedAt;

      return {
        inputs: newFollowers.map(f => ({
          userId: f.user_id,
          userLogin: f.user_login,
          userName: f.user_name,
          followedAt: f.followed_at
        })),
        updatedState: {
          lastFollowedAt: newestFollowedAt || lastFollowedAt,
          broadcasterId
        }
      };
    },

    handleEvent: async ctx => {
      let state = ctx.state as { broadcasterId?: string } | null;
      return {
        type: 'follower.new',
        id: `${ctx.input.userId}-${ctx.input.followedAt}`,
        output: {
          followerId: ctx.input.userId,
          followerLogin: ctx.input.userLogin,
          followerName: ctx.input.userName,
          followedAt: ctx.input.followedAt,
          broadcasterId: state?.broadcasterId || ''
        }
      };
    }
  })
  .build();
