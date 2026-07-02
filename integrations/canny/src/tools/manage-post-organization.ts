import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let managePostOrganizationTool = SlateTool.create(spec, {
  name: 'Manage Post Organization',
  key: 'manage_post_organization',
  description: `Move a post to a different board, change its category, add/remove tags, or merge posts together. Use the \`action\` field to specify the operation.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['move_board', 'change_category', 'add_tag', 'remove_tag', 'merge'])
        .describe('The organizational action to perform'),
      postId: z.string().describe('The post ID to act on'),
      boardId: z.string().optional().describe('Target board ID (for move_board)'),
      categoryId: z
        .string()
        .nullable()
        .optional()
        .describe('Category ID to set (for change_category, null to remove)'),
      tagId: z
        .string()
        .optional()
        .describe('Tag ID to add or remove (for add_tag/remove_tag)'),
      mergeIntoPostId: z
        .string()
        .optional()
        .describe('Post ID to merge into (for merge action)'),
      mergerId: z.string().optional().describe('User ID of the person performing the merge')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    let { action, postId } = ctx.input;

    switch (action) {
      case 'move_board':
        if (!ctx.input.boardId) throw new Error('boardId is required for move_board action');
        await client.changePostBoard(postId, ctx.input.boardId);
        return {
          output: { success: true },
          message: `Moved post **${postId}** to board **${ctx.input.boardId}**.`
        };

      case 'change_category':
        await client.changePostCategory(postId, ctx.input.categoryId ?? null);
        return {
          output: { success: true },
          message: ctx.input.categoryId
            ? `Changed category of post **${postId}** to **${ctx.input.categoryId}**.`
            : `Removed category from post **${postId}**.`
        };

      case 'add_tag':
        if (!ctx.input.tagId) throw new Error('tagId is required for add_tag action');
        await client.addTagToPost(postId, ctx.input.tagId);
        return {
          output: { success: true },
          message: `Added tag **${ctx.input.tagId}** to post **${postId}**.`
        };

      case 'remove_tag':
        if (!ctx.input.tagId) throw new Error('tagId is required for remove_tag action');
        await client.removeTagFromPost(postId, ctx.input.tagId);
        return {
          output: { success: true },
          message: `Removed tag **${ctx.input.tagId}** from post **${postId}**.`
        };

      case 'merge':
        if (!ctx.input.mergeIntoPostId)
          throw new Error('mergeIntoPostId is required for merge action');
        if (!ctx.input.mergerId) throw new Error('mergerId is required for merge action');
        await client.mergePosts({
          mergePostID: postId,
          intoPostID: ctx.input.mergeIntoPostId,
          mergerID: ctx.input.mergerId
        });
        return {
          output: { success: true },
          message: `Merged post **${postId}** into **${ctx.input.mergeIntoPostId}**.`
        };

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  })
  .build();
