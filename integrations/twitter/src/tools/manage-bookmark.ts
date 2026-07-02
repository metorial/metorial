import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwitterClient } from '../lib/client';
import { twitterServiceError } from '../lib/errors';
import { mapPost, postSchema } from '../lib/helpers';
import { spec } from '../spec';

export let manageBookmark = SlateTool.create(spec, {
  name: 'Manage Bookmark',
  key: 'manage_bookmark',
  description: `Add, remove, or list bookmarked posts for the authenticated user.`,
  instructions: [
    'Use action **add** or **remove** to bookmark/unbookmark a post.',
    'Use action **list** to retrieve all bookmarked posts.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['add', 'remove', 'list']).describe('Action to perform'),
      userId: z.string().describe('Authenticated user ID'),
      postId: z.string().optional().describe('Post ID (required for add/remove)'),
      maxResults: z.number().optional().describe('Number of results for list action'),
      paginationToken: z.string().optional().describe('Pagination token for list action')
    })
  )
  .output(
    z.object({
      success: z.boolean().optional().describe('Whether the action was successful'),
      posts: z.array(postSchema).optional().describe('Bookmarked posts (for list)'),
      nextToken: z.string().optional().describe('Pagination token for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitterClient(ctx.auth.token);
    let { action, userId, postId, maxResults, paginationToken } = ctx.input;

    if (action === 'add') {
      if (!postId) throw twitterServiceError('postId is required to add a bookmark.');
      await client.addBookmark(userId, postId);
      return {
        output: { success: true },
        message: `Bookmarked post ${postId}.`
      };
    }

    if (action === 'remove') {
      if (!postId) throw twitterServiceError('postId is required to remove a bookmark.');
      await client.removeBookmark(userId, postId);
      return {
        output: { success: true },
        message: `Removed bookmark for post ${postId}.`
      };
    }

    if (action === 'list') {
      let result = await client.getBookmarks(userId, { maxResults, paginationToken });
      let posts = (result.data || []).map(mapPost);
      return {
        output: { posts, nextToken: result.meta?.next_token },
        message: `Retrieved **${posts.length}** bookmarked post(s).`
      };
    }

    throw twitterServiceError('Invalid action.');
  })
  .build();
