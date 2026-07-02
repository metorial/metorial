import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCommentTool = SlateTool.create(spec, {
  name: 'Manage Comment',
  key: 'manage_comment',
  description: `Create or update a comment on any Basecamp recording (to-do, message, document, etc.).
To **create**, provide the \`projectId\`, \`recordingId\`, and \`content\`.
To **update**, provide the \`projectId\`, \`commentId\`, and new \`content\`.`
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project (bucket)'),
      action: z.enum(['create', 'update']).describe('Action to perform'),
      recordingId: z
        .string()
        .optional()
        .describe('ID of the recording to comment on (required for create)'),
      commentId: z.string().optional().describe('ID of the comment (required for update)'),
      content: z.string().describe('Comment body (supports HTML)')
    })
  )
  .output(
    z.object({
      commentId: z.number().describe('ID of the comment'),
      content: z.string().describe('Content of the comment'),
      createdAt: z.string().describe('When the comment was created'),
      creatorName: z.string().nullable().describe('Name of the comment creator')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let { action, projectId } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.recordingId)
        throw new Error('recordingId is required for creating a comment');

      let comment = await client.createComment(projectId, ctx.input.recordingId, {
        content: ctx.input.content
      });

      return {
        output: {
          commentId: comment.id,
          content: comment.content,
          createdAt: comment.created_at,
          creatorName: comment.creator?.name ?? null
        },
        message: `Created comment on recording **${ctx.input.recordingId}**.`
      };
    }

    // update
    if (!ctx.input.commentId) throw new Error('commentId is required for updating a comment');

    let comment = await client.updateComment(projectId, ctx.input.commentId, {
      content: ctx.input.content
    });

    return {
      output: {
        commentId: comment.id,
        content: comment.content,
        createdAt: comment.created_at,
        creatorName: comment.creator?.name ?? null
      },
      message: `Updated comment **${comment.id}**.`
    };
  })
  .build();
