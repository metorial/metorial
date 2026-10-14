import { isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deletePost = SlateTool.create(spec, {
  name: 'Delete Post',
  key: 'delete_post',
  description: `Delete one or more posts from social networks. Supports deleting a single post by ID, bulk deletion of multiple posts, or clearing all scheduled posts.`,
  constraints: [
    'Published posts cannot be deleted from Instagram or TikTok via API.',
    'Facebook image stories cannot be deleted via API.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      postId: z.string().optional().describe('Ayrshare Post ID to delete'),
      bulk: z
        .array(z.string())
        .optional()
        .describe('Array of Ayrshare Post IDs for bulk deletion'),
      deleteAllScheduled: z
        .boolean()
        .optional()
        .describe('Delete all pending scheduled posts for the profile')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Deletion status'),
      deletedPosts: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Details of deleted posts per platform')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      ...ctx.auth,
      profileKey: ctx.config.profileKey
    });

    let result = await client.deletePost({
      postId: ctx.input.postId,
      bulk: ctx.input.bulk,
      deleteAllScheduled: ctx.input.deleteAllScheduled
    });

    let deletedPosts =
      result.postIds ||
      result.posts ||
      Object.entries(result).flatMap(([platform, value]) =>
        isApiErrorRecord(value) && value.action === 'delete' ? [{ ...value, platform }] : []
      );
    let description = ctx.input.deleteAllScheduled
      ? 'All scheduled posts deleted.'
      : ctx.input.postId
        ? `Post **${ctx.input.postId}** deleted.`
        : ctx.input.bulk
          ? `**${ctx.input.bulk.length}** posts deleted in bulk.`
          : 'All scheduled posts deleted.';

    return {
      output: {
        status: result.status || 'success',
        deletedPosts
      },
      message: `${description} Status: **${result.status || 'success'}**.`
    };
  })
  .build();
