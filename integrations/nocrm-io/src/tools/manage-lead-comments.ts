import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLeadComments = SlateTool.create(spec, {
  name: 'Manage Lead Comments',
  key: 'manage_lead_comments',
  description: `List, create, update, or delete comments on a lead. Comments can include an activity type (call, email, meeting, etc.) to log sales activities. Use the "action" field to specify the operation.`,
  instructions: [
    'Set action to "list" to retrieve all comments on a lead.',
    'Set action to "create" to add a new comment. Optionally include an activityId to log a sales activity.',
    'Set action to "update" to modify an existing comment (requires commentId).',
    'Set action to "delete" to remove a comment (requires commentId).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      leadId: z.number().describe('ID of the lead'),
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Operation to perform'),
      commentId: z.number().optional().describe('Comment ID (required for update and delete)'),
      comment: z.string().optional().describe('Comment text (required for create and update)'),
      activityId: z
        .number()
        .optional()
        .describe('Activity type ID to log (e.g. call, email, meeting) — only for create')
    })
  )
  .output(
    z.object({
      comments: z
        .array(
          z.object({
            commentId: z.number().describe('Comment ID'),
            content: z.string().describe('Comment text'),
            activityId: z.number().optional().describe('Activity type ID'),
            userId: z.number().optional().describe('Author user ID'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of comments (for "list" action)'),
      comment: z
        .object({
          commentId: z.number().describe('Comment ID'),
          content: z.string().describe('Comment text'),
          activityId: z.number().optional().describe('Activity type ID'),
          userId: z.number().optional().describe('Author user ID'),
          createdAt: z.string().optional().describe('Creation timestamp')
        })
        .optional()
        .describe('Created or updated comment'),
      deleted: z.boolean().optional().describe('Whether the comment was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let mapComment = (c: any) => ({
      commentId: c.id,
      content: c.comment || c.content || '',
      activityId: c.activity_id,
      userId: c.user_id,
      createdAt: c.created_at
    });

    if (ctx.input.action === 'list') {
      let comments = await client.listLeadComments(ctx.input.leadId);
      let mapped = comments.map(mapComment);
      return {
        output: { comments: mapped },
        message: `Found **${mapped.length}** comments on lead ${ctx.input.leadId}.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.comment) throw new Error('Comment text is required for create action');
      let result = await client.createLeadComment(ctx.input.leadId, {
        comment: ctx.input.comment,
        activityId: ctx.input.activityId
      });
      return {
        output: { comment: mapComment(result) },
        message: `Added comment to lead ${ctx.input.leadId}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.commentId) throw new Error('commentId is required for update action');
      if (!ctx.input.comment) throw new Error('Comment text is required for update action');
      let result = await client.updateLeadComment(
        ctx.input.leadId,
        ctx.input.commentId,
        ctx.input.comment
      );
      return {
        output: { comment: mapComment(result) },
        message: `Updated comment ${ctx.input.commentId} on lead ${ctx.input.leadId}.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.commentId) throw new Error('commentId is required for delete action');
      await client.deleteLeadComment(ctx.input.leadId, ctx.input.commentId);
      return {
        output: { deleted: true },
        message: `Deleted comment ${ctx.input.commentId} from lead ${ctx.input.leadId}.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
