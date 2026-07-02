import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageStoryComments = SlateTool.create(spec, {
  name: 'Manage Story Comments',
  key: 'manage_story_comments',
  description: `Create, update, or delete comments on a story. Use the \`action\` field to specify the operation. When creating, provide the comment text. When updating, provide the comment ID and new text. When deleting, provide the comment ID.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      storyId: z.number().describe('Public ID of the story'),
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('Action to perform on the comment'),
      commentId: z.number().optional().describe('Comment ID (required for update and delete)'),
      text: z
        .string()
        .optional()
        .describe('Comment text in Markdown (required for create and update)')
    })
  )
  .output(
    z.object({
      commentId: z
        .number()
        .nullable()
        .describe('ID of the created/updated comment (null for delete)'),
      text: z.string().nullable().describe('Text of the created/updated comment'),
      authorId: z.string().nullable().describe('UUID of the comment author'),
      createdAt: z.string().nullable().describe('Comment creation timestamp'),
      deleted: z.boolean().optional().describe('Whether the comment was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.text) throw new Error('Text is required to create a comment');
      let comment = await client.createStoryComment(ctx.input.storyId, ctx.input.text);

      return {
        output: {
          commentId: comment.id,
          text: comment.text,
          authorId: comment.author_id ?? null,
          createdAt: comment.created_at
        },
        message: `Created comment on story ${ctx.input.storyId}`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.commentId) throw new Error('Comment ID is required for update');
      if (!ctx.input.text) throw new Error('Text is required to update a comment');
      let comment = await client.updateStoryComment(
        ctx.input.storyId,
        ctx.input.commentId,
        ctx.input.text
      );

      return {
        output: {
          commentId: comment.id,
          text: comment.text,
          authorId: comment.author_id ?? null,
          createdAt: comment.created_at
        },
        message: `Updated comment ${ctx.input.commentId} on story ${ctx.input.storyId}`
      };
    }

    // delete
    if (!ctx.input.commentId) throw new Error('Comment ID is required for delete');
    await client.deleteStoryComment(ctx.input.storyId, ctx.input.commentId);

    return {
      output: {
        commentId: null,
        text: null,
        authorId: null,
        createdAt: null,
        deleted: true
      },
      message: `Deleted comment ${ctx.input.commentId} from story ${ctx.input.storyId}`
    };
  })
  .build();
