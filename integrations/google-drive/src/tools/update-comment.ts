import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleDriveClient } from '../lib/client';
import { googleDriveActionScopes } from '../scopes';
import { spec } from '../spec';

let authorSchema = z.object({
  displayName: z.string().optional().describe("Author's display name"),
  emailAddress: z.string().optional().describe("Author's email address, when available"),
  photoLink: z.string().optional().describe("Author's profile photo URL, when available")
});

export let updateCommentTool = SlateTool.create(spec, {
  name: 'Update Comment or Reply',
  key: 'update_comment',
  description:
    'Update the text of an existing Google Drive comment. Provide replyId to update a reply in that comment thread instead.',
  instructions: [
    'Omit replyId to update the top-level comment.',
    'Provide replyId to update that reply while leaving the parent comment unchanged.',
    'Google Drive only allows the original author to edit a comment or reply.'
  ],
  tags: {
    destructive: true
  }
})
  .scopes(googleDriveActionScopes.updateComment)
  .input(
    z.object({
      fileId: z.string().min(1).describe('ID of the file containing the comment'),
      commentId: z.string().min(1).describe('ID of the parent comment'),
      replyId: z
        .string()
        .min(1)
        .optional()
        .describe('ID of the reply to update; omit to update the parent comment'),
      content: z.string().min(1).describe('Replacement plain-text content')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('ID of the file containing the updated resource'),
      commentId: z.string().describe('ID of the parent comment'),
      replyId: z.string().optional().describe('ID of the updated reply, when applicable'),
      updatedResource: z.enum(['comment', 'reply']).describe('Resource that was updated'),
      content: z.string().describe('Updated plain-text content'),
      modifiedTime: z.string().describe('Last modification timestamp'),
      author: authorSchema.describe('Author of the comment or reply'),
      resolved: z
        .boolean()
        .optional()
        .describe('Whether the parent comment thread is resolved'),
      action: z
        .string()
        .optional()
        .describe('Resolve or reopen action associated with a reply, when present')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);

    if (ctx.input.replyId) {
      let reply = await client.updateReply(
        ctx.input.fileId,
        ctx.input.commentId,
        ctx.input.replyId,
        ctx.input.content
      );

      return {
        output: {
          fileId: ctx.input.fileId,
          commentId: ctx.input.commentId,
          replyId: reply.replyId,
          updatedResource: 'reply' as const,
          content: reply.content,
          modifiedTime: reply.modifiedTime,
          author: reply.author,
          action: reply.action
        },
        message: `Updated reply \`${reply.replyId}\` on comment \`${ctx.input.commentId}\`.`
      };
    }

    let comment = await client.updateComment(
      ctx.input.fileId,
      ctx.input.commentId,
      ctx.input.content
    );

    return {
      output: {
        fileId: ctx.input.fileId,
        commentId: comment.commentId,
        updatedResource: 'comment' as const,
        content: comment.content,
        modifiedTime: comment.modifiedTime,
        author: comment.author,
        resolved: comment.resolved
      },
      message: `Updated comment \`${comment.commentId}\` on file \`${ctx.input.fileId}\`.`
    };
  })
  .build();
