import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageIssueCommentTool = SlateTool.create(spec, {
  name: 'Manage Issue Comment',
  key: 'manage_issue_comment',
  description: `List, create, update, or delete comments (notes) on a Sentry issue. Comments support markdown formatting.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      issueId: z.string().describe('The issue ID to manage comments for'),
      commentId: z.string().optional().describe('Comment ID (required for update/delete)'),
      text: z
        .string()
        .optional()
        .describe('Comment text in markdown (required for create/update)')
    })
  )
  .output(
    z.object({
      comment: z.any().optional().describe('Comment data'),
      comments: z.array(z.any()).optional().describe('List of comments'),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'list') {
      let comments = await client.listIssueComments(ctx.input.issueId);
      return {
        output: { comments },
        message: `Found **${(comments || []).length}** comments on issue **${ctx.input.issueId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.text) throw new Error('text is required');
      let comment = await client.createIssueComment(ctx.input.issueId, {
        text: ctx.input.text
      });
      return {
        output: { comment },
        message: `Added comment to issue **${ctx.input.issueId}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.commentId) throw new Error('commentId is required');
      if (!ctx.input.text) throw new Error('text is required');
      let comment = await client.updateIssueComment(ctx.input.issueId, ctx.input.commentId, {
        text: ctx.input.text
      });
      return {
        output: { comment },
        message: `Updated comment **${ctx.input.commentId}** on issue **${ctx.input.issueId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.commentId) throw new Error('commentId is required');
      await client.deleteIssueComment(ctx.input.issueId, ctx.input.commentId);
      return {
        output: { deleted: true },
        message: `Deleted comment **${ctx.input.commentId}** from issue **${ctx.input.issueId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
