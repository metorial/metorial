import { SlateTool } from 'slates';
import { z } from 'zod';
import { AhaClient } from '../lib/client';
import { spec } from '../spec';

let commentOutputSchema = z.object({
  commentId: z.string().describe('Comment ID'),
  body: z.string().describe('Comment body (HTML)'),
  authorName: z.string().optional().describe('Comment author name'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let manageComment = SlateTool.create(spec, {
  name: 'Manage Comment',
  key: 'manage_comment',
  description: `Create, update, list, or delete comments on Aha! records. Comments can be added to features, epics, ideas, releases, goals, initiatives, requirements, and to-dos.`,
  instructions: [
    'To **create** a comment, set action to "create" and provide recordType, recordId, and body.',
    'To **list** comments, set action to "list" and provide recordType and recordId.',
    'To **update** a comment, set action to "update" and provide commentId and body.',
    'To **delete** a comment, set action to "delete" and provide commentId.',
    'Valid **recordType** values: features, epics, ideas, releases, goals, initiatives, requirements, to_dos.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'list', 'update', 'delete']).describe('Action to perform'),
      recordType: z
        .enum([
          'features',
          'epics',
          'ideas',
          'releases',
          'goals',
          'initiatives',
          'requirements',
          'to_dos'
        ])
        .optional()
        .describe('Type of parent record (required for create/list)'),
      recordId: z
        .string()
        .optional()
        .describe('Parent record ID or reference number (required for create/list)'),
      commentId: z.string().optional().describe('Comment ID (required for update/delete)'),
      body: z
        .string()
        .optional()
        .describe('Comment body (HTML supported, required for create/update)'),
      page: z.number().optional().describe('Page number for listing'),
      perPage: z.number().optional().describe('Records per page for listing')
    })
  )
  .output(
    z.object({
      comment: commentOutputSchema.optional().describe('Single comment (for create/update)'),
      comments: z
        .array(commentOutputSchema)
        .optional()
        .describe('List of comments (for list action)'),
      totalRecords: z.number().optional().describe('Total comments (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AhaClient(ctx.config.subdomain, ctx.auth.token);
    let { action } = ctx.input;

    if (action === 'list') {
      if (!ctx.input.recordType || !ctx.input.recordId) {
        throw new Error('recordType and recordId are required to list comments');
      }

      let result = await client.listComments(ctx.input.recordType, ctx.input.recordId, {
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });

      let comments = result.comments.map(c => ({
        commentId: c.id,
        body: c.body,
        authorName: c.user?.name,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      }));

      return {
        output: {
          comments,
          totalRecords: result.pagination.total_records
        },
        message: `Found **${result.pagination.total_records}** comments on ${ctx.input.recordType}/${ctx.input.recordId}.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.recordType || !ctx.input.recordId) {
        throw new Error('recordType and recordId are required to create a comment');
      }
      if (!ctx.input.body) throw new Error('body is required to create a comment');

      let comment = await client.createComment(
        ctx.input.recordType,
        ctx.input.recordId,
        ctx.input.body
      );

      return {
        output: {
          comment: {
            commentId: comment.id,
            body: comment.body,
            authorName: comment.user?.name,
            createdAt: comment.created_at,
            updatedAt: comment.updated_at
          }
        },
        message: `Added comment to ${ctx.input.recordType}/${ctx.input.recordId}.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.commentId) throw new Error('commentId is required to update a comment');
      if (!ctx.input.body) throw new Error('body is required to update a comment');

      let comment = await client.updateComment(ctx.input.commentId, ctx.input.body);

      return {
        output: {
          comment: {
            commentId: comment.id,
            body: comment.body,
            authorName: comment.user?.name,
            createdAt: comment.created_at,
            updatedAt: comment.updated_at
          }
        },
        message: `Updated comment \`${ctx.input.commentId}\`.`
      };
    }

    // delete
    if (!ctx.input.commentId) throw new Error('commentId is required to delete a comment');
    await client.deleteComment(ctx.input.commentId);
    return {
      output: {},
      message: `Deleted comment \`${ctx.input.commentId}\`.`
    };
  })
  .build();
