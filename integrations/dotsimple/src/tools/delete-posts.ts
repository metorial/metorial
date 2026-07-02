import { SlateTool } from 'slates';
import { z } from 'zod';
import { DotSimpleClient } from '../lib/client';
import { spec } from '../spec';

export let deletePosts = SlateTool.create(spec, {
  name: 'Delete Posts',
  key: 'delete_posts',
  description: `Delete one or more social media posts from the workspace. Supports both single and bulk deletion by providing post UUIDs.`,
  constraints: ['This action is irreversible. Deleted posts cannot be recovered.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      postUuids: z.array(z.string()).min(1).describe('Array of post UUIDs to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful'),
      deletedCount: z.number().describe('Number of posts deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DotSimpleClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId
    });

    if (ctx.input.postUuids.length === 1) {
      await client.deletePost(ctx.input.postUuids[0]!);
    } else {
      await client.deletePosts(ctx.input.postUuids);
    }

    return {
      output: {
        success: true,
        deletedCount: ctx.input.postUuids.length
      },
      message: `Successfully deleted **${ctx.input.postUuids.length}** post(s).`
    };
  })
  .build();
