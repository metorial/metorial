import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwitterClient } from '../lib/client';
import { twitterServiceError } from '../lib/errors';
import { mapUser, userSchema } from '../lib/helpers';
import { spec } from '../spec';

export let manageFollow = SlateTool.create(spec, {
  name: 'Manage Follow',
  key: 'manage_follow',
  description: `Follow or unfollow a user, or retrieve a user's followers or following list.`,
  instructions: [
    'Use action **follow** or **unfollow** to manage follow relationships (requires userId and targetUserId).',
    "Use action **list_followers** to get a user's followers.",
    'Use action **list_following** to get users a user is following.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['follow', 'unfollow', 'list_followers', 'list_following'])
        .describe('Action to perform'),
      userId: z.string().describe('User ID performing the action or whose list to retrieve'),
      targetUserId: z
        .string()
        .optional()
        .describe('Target user ID (required for follow/unfollow)'),
      maxResults: z
        .number()
        .optional()
        .describe('Number of results for list actions (max 1000)'),
      paginationToken: z.string().optional().describe('Pagination token for list actions')
    })
  )
  .output(
    z.object({
      success: z.boolean().optional().describe('Whether the action was successful'),
      users: z.array(userSchema).optional().describe('Users in the follower/following list'),
      nextToken: z.string().optional().describe('Pagination token for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitterClient(ctx.auth.token);
    let { action, userId, targetUserId, maxResults, paginationToken } = ctx.input;

    if (action === 'follow') {
      if (!targetUserId)
        throw twitterServiceError('targetUserId is required to follow a user.');
      await client.followUser(userId, targetUserId);
      return {
        output: { success: true },
        message: `Followed user ${targetUserId}.`
      };
    }

    if (action === 'unfollow') {
      if (!targetUserId)
        throw twitterServiceError('targetUserId is required to unfollow a user.');
      await client.unfollowUser(userId, targetUserId);
      return {
        output: { success: true },
        message: `Unfollowed user ${targetUserId}.`
      };
    }

    if (action === 'list_followers') {
      let result = await client.getFollowers(userId, { maxResults, paginationToken });
      let users = (result.data || []).map(mapUser);
      return {
        output: { users, nextToken: result.meta?.next_token },
        message: `Retrieved **${users.length}** follower(s).`
      };
    }

    if (action === 'list_following') {
      let result = await client.getFollowing(userId, { maxResults, paginationToken });
      let users = (result.data || []).map(mapUser);
      return {
        output: { users, nextToken: result.meta?.next_token },
        message: `Retrieved **${users.length}** user(s) being followed.`
      };
    }

    throw twitterServiceError('Invalid action.');
  })
  .build();
