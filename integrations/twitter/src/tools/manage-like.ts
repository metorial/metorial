import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwitterClient } from '../lib/client';
import { twitterServiceError } from '../lib/errors';
import { mapPost, mapUser, postSchema, userSchema } from '../lib/helpers';
import { spec } from '../spec';

export let manageLike = SlateTool.create(spec, {
  name: 'Manage Like',
  key: 'manage_like',
  description: `Like or unlike a post, retrieve a user's liked posts, or get users who liked a specific post.`,
  instructions: [
    'Use action **like** or **unlike** to like/unlike a post (requires userId and postId).',
    'Use action **list_liked_posts** to get posts a user has liked.',
    'Use action **list_liking_users** to get users who liked a specific post.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['like', 'unlike', 'list_liked_posts', 'list_liking_users'])
        .describe('Action to perform'),
      userId: z
        .string()
        .optional()
        .describe('User ID (required for like, unlike, list_liked_posts)'),
      postId: z
        .string()
        .optional()
        .describe('Post ID (required for like, unlike, list_liking_users)'),
      maxResults: z.number().optional().describe('Number of results for list actions'),
      paginationToken: z.string().optional().describe('Pagination token for list actions')
    })
  )
  .output(
    z.object({
      success: z.boolean().optional().describe('Whether the action was successful'),
      posts: z.array(postSchema).optional().describe('Liked posts (for list_liked_posts)'),
      users: z
        .array(userSchema)
        .optional()
        .describe('Users who liked the post (for list_liking_users)'),
      nextToken: z.string().optional().describe('Pagination token for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitterClient(ctx.auth.token);
    let { action, userId, postId, maxResults, paginationToken } = ctx.input;

    if (action === 'like') {
      if (!userId || !postId)
        throw twitterServiceError('userId and postId are required to like a post.');
      await client.likePost(userId, postId);
      return {
        output: { success: true },
        message: `Liked post ${postId}.`
      };
    }

    if (action === 'unlike') {
      if (!userId || !postId)
        throw twitterServiceError('userId and postId are required to unlike a post.');
      await client.unlikePost(userId, postId);
      return {
        output: { success: true },
        message: `Unliked post ${postId}.`
      };
    }

    if (action === 'list_liked_posts') {
      if (!userId) throw twitterServiceError('userId is required to list liked posts.');
      let result = await client.getLikedPosts(userId, { maxResults, paginationToken });
      let posts = (result.data || []).map(mapPost);
      return {
        output: { posts, nextToken: result.meta?.next_token },
        message: `Retrieved **${posts.length}** liked post(s).`
      };
    }

    if (action === 'list_liking_users') {
      if (!postId) throw twitterServiceError('postId is required to list liking users.');
      let result = await client.getPostLikingUsers(postId, { maxResults, paginationToken });
      let users = (result.data || []).map(mapUser);
      return {
        output: { users, nextToken: result.meta?.next_token },
        message: `Retrieved **${users.length}** user(s) who liked the post.`
      };
    }

    throw twitterServiceError('Invalid action.');
  })
  .build();
