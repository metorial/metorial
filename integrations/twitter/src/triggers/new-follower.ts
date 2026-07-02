import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { TwitterClient } from '../lib/client';
import { mapUser, userSchema } from '../lib/helpers';
import { spec } from '../spec';

export let newFollower = SlateTrigger.create(spec, {
  name: 'New Follower',
  key: 'new_follower',
  description: 'Triggers when a new user follows the authenticated user.'
})
  .input(
    z.object({
      userId: z.string().describe('ID of the new follower'),
      name: z.string().describe('Display name of the new follower'),
      username: z.string().describe('Username of the new follower'),
      description: z.string().optional().describe('Bio of the new follower'),
      profileImageUrl: z.string().optional().describe('Profile image URL'),
      followersCount: z.number().optional().describe('Follower count of the new follower'),
      followingCount: z.number().optional().describe('Following count of the new follower'),
      postCount: z.number().optional().describe('Post count of the new follower')
    })
  )
  .output(userSchema)
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new TwitterClient(ctx.auth.token);

      let me = await client.getMe();
      let userId = me.data.id;

      let result = await client.getFollowers(userId, { maxResults: 50 });
      let followers = (result.data || []).map(mapUser);

      let knownFollowerIds: string[] = ctx.state?.knownFollowerIds || [];
      let newFollowers =
        knownFollowerIds.length > 0
          ? followers.filter((f: any) => !knownFollowerIds.includes(f.userId))
          : [];

      let updatedIds = followers.map((f: any) => f.userId);

      let inputs = newFollowers.map((f: any) => ({
        userId: f.userId,
        name: f.name,
        username: f.username,
        description: f.description,
        profileImageUrl: f.profileImageUrl,
        followersCount: f.followersCount,
        followingCount: f.followingCount,
        postCount: f.postCount
      }));

      return {
        inputs,
        updatedState: {
          knownFollowerIds: updatedIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'user.followed',
        id: `follow_${ctx.input.userId}_${Date.now()}`,
        output: {
          userId: ctx.input.userId,
          name: ctx.input.name,
          username: ctx.input.username,
          description: ctx.input.description,
          profileImageUrl: ctx.input.profileImageUrl,
          followersCount: ctx.input.followersCount,
          followingCount: ctx.input.followingCount,
          postCount: ctx.input.postCount
        }
      };
    }
  })
  .build();
