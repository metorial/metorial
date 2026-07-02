import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageComment = SlateTool.create(spec, {
  name: 'Manage Comment',
  key: 'manage_comment',
  description: `Create, update, or delete a comment on a Teamwork resource. Comments can be added to tasks, milestones, notebooks, and files.`,
  instructions: [
    'For "create", provide resourceType, resourceId, and body.',
    'resourceType: "tasks", "milestones", "notebooks", "files".',
    'For "update" and "delete", provide the commentId.'
  ],
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The action to perform'),
      commentId: z.string().optional().describe('Comment ID (required for update/delete)'),
      resourceType: z
        .enum(['tasks', 'milestones', 'notebooks', 'files'])
        .optional()
        .describe('Type of resource to comment on (required for create)'),
      resourceId: z
        .string()
        .optional()
        .describe('ID of the resource to comment on (required for create)'),
      body: z.string().optional().describe('Comment body text (HTML supported)')
    })
  )
  .output(
    z.object({
      commentId: z.string().optional().describe('ID of the comment'),
      created: z.boolean().optional().describe('Whether the comment was created'),
      updated: z.boolean().optional().describe('Whether the comment was updated'),
      deleted: z.boolean().optional().describe('Whether the comment was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.resourceType)
        throw new Error('resourceType is required to create a comment');
      if (!ctx.input.resourceId) throw new Error('resourceId is required to create a comment');
      if (!ctx.input.body) throw new Error('body is required to create a comment');
      let result = await client.createComment(ctx.input.resourceType, ctx.input.resourceId, {
        body: ctx.input.body
      });
      let commentId = result.commentId || result.id;
      return {
        output: { commentId: commentId ? String(commentId) : undefined, created: true },
        message: `Created comment on ${ctx.input.resourceType}/${ctx.input.resourceId}.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.commentId) throw new Error('commentId is required to update a comment');
      if (!ctx.input.body) throw new Error('body is required to update a comment');
      await client.updateComment(ctx.input.commentId, { body: ctx.input.body });
      return {
        output: { commentId: ctx.input.commentId, updated: true },
        message: `Updated comment **${ctx.input.commentId}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.commentId) throw new Error('commentId is required to delete a comment');
      await client.deleteComment(ctx.input.commentId);
      return {
        output: { commentId: ctx.input.commentId, deleted: true },
        message: `Deleted comment **${ctx.input.commentId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
