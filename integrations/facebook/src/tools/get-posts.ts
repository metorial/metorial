import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPosts = SlateTool.create(spec, {
  name: 'Get Posts',
  key: 'get_posts',
  description: `Retrieve posts from a Facebook Page or user timeline. Returns post content, engagement metrics (likes, comments, shares, reactions), and metadata.
Provide a \`pageId\` or \`userId\` to fetch posts from a specific Page or user. Omit both to get the authenticated user's posts.
Supports cursor-based pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageId: z.string().optional().describe('Facebook Page ID to get posts from'),
      userId: z
        .string()
        .optional()
        .describe('Facebook User ID to get posts from. Omit to use authenticated user.'),
      postId: z.string().optional().describe('Specific post ID to retrieve a single post'),
      limit: z.number().optional().describe('Maximum number of posts to return (default: 25)'),
      after: z
        .string()
        .optional()
        .describe('Pagination cursor to fetch the next page of results')
    })
  )
  .output(
    z.object({
      posts: z
        .array(
          z.object({
            postId: z.string().describe('Post ID'),
            message: z.string().optional().describe('Post message text'),
            story: z.string().optional().describe('Post story text'),
            createdTime: z
              .string()
              .optional()
              .describe('ISO timestamp when the post was created'),
            updatedTime: z
              .string()
              .optional()
              .describe('ISO timestamp when the post was last updated'),
            fullPicture: z.string().optional().describe('URL of the full-size post image'),
            permalinkUrl: z.string().optional().describe('Permanent URL to the post'),
            type: z
              .string()
              .optional()
              .describe('Post type (status, photo, video, link, etc.)'),
            authorId: z.string().optional().describe('ID of the post author'),
            authorName: z.string().optional().describe('Name of the post author'),
            totalLikes: z.number().optional().describe('Total number of likes'),
            totalComments: z.number().optional().describe('Total number of comments'),
            totalShares: z.number().optional().describe('Total number of shares'),
            totalReactions: z.number().optional().describe('Total number of reactions')
          })
        )
        .describe('List of posts'),
      nextCursor: z
        .string()
        .optional()
        .describe('Cursor for fetching the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    if (ctx.input.postId) {
      let post = await client.getPost(ctx.input.postId);
      return {
        output: {
          posts: [
            {
              postId: post.id,
              message: post.message,
              story: post.story,
              createdTime: post.created_time,
              updatedTime: post.updated_time,
              fullPicture: post.full_picture,
              permalinkUrl: post.permalink_url,
              type: post.type,
              authorId: post.from?.id,
              authorName: post.from?.name,
              totalLikes: post.likes?.summary?.total_count,
              totalComments: post.comments?.summary?.total_count,
              totalShares: post.shares?.count,
              totalReactions: post.reactions?.summary?.total_count
            }
          ]
        },
        message: `Retrieved post **${post.id}**.`
      };
    }

    let result = ctx.input.pageId
      ? await client.getPagePosts(ctx.input.pageId, {
          limit: ctx.input.limit,
          after: ctx.input.after
        })
      : await client.getUserPosts(ctx.input.userId || 'me', {
          limit: ctx.input.limit,
          after: ctx.input.after
        });

    return {
      output: {
        posts: result.data.map(post => ({
          postId: post.id,
          message: post.message,
          story: post.story,
          createdTime: post.created_time,
          updatedTime: post.updated_time,
          fullPicture: post.full_picture,
          permalinkUrl: post.permalink_url,
          type: post.type,
          authorId: post.from?.id,
          authorName: post.from?.name,
          totalLikes: post.likes?.summary?.total_count,
          totalComments: post.comments?.summary?.total_count,
          totalShares: post.shares?.count,
          totalReactions: post.reactions?.summary?.total_count
        })),
        nextCursor: result.paging?.cursors?.after
      },
      message: `Retrieved **${result.data.length}** post(s).`
    };
  })
  .build();
