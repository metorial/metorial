import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleDriveClient } from '../lib/client';
import { googleDriveActionScopes } from '../scopes';
import { spec } from '../spec';

let authorSchema = z.object({
  displayName: z.string().optional(),
  emailAddress: z.string().optional(),
  photoLink: z.string().optional()
});

let replySchema = z.object({
  replyId: z.string(),
  content: z.string(),
  createdTime: z.string(),
  modifiedTime: z.string(),
  author: authorSchema,
  action: z.string().optional()
});

let commentSchema = z.object({
  commentId: z.string(),
  content: z.string(),
  createdTime: z.string(),
  modifiedTime: z.string(),
  author: authorSchema,
  resolved: z.boolean(),
  replies: z.array(replySchema).optional(),
  quotedFileContent: z
    .object({
      mimeType: z.string(),
      value: z.string()
    })
    .optional(),
  anchor: z.string().optional()
});

export let listCommentsTool = SlateTool.create(spec, {
  name: 'List Comments',
  key: 'list_comments',
  description: `List all comments on a file, including threaded replies. Shows comment content, author, timestamps, and resolution status.`,
  instructions: [
    'Pagination: when using `pageToken`, keep the same `fileId` and `includeDeleted` value as the request that returned the token.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googleDriveActionScopes.listComments)
  .input(
    z.object({
      fileId: z.string().describe('ID of the file'),
      pageSize: z.number().optional().describe('Maximum number of comments to return'),
      pageToken: z.string().optional().describe('Token for fetching the next page'),
      includeDeleted: z.boolean().optional().describe('Include deleted comments')
    })
  )
  .output(
    z.object({
      comments: z.array(commentSchema),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);
    let result = await client.listComments(ctx.input.fileId, {
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken,
      includeDeleted: ctx.input.includeDeleted
    });

    return {
      output: result,
      message: `Found **${result.comments.length}** comment(s) on file \`${ctx.input.fileId}\`.`
    };
  })
  .build();

export let createCommentTool = SlateTool.create(spec, {
  name: 'Create Comment',
  key: 'create_comment',
  description: `Add a comment to a file. Optionally quote specific content from the file that the comment relates to.`
})
  .scopes(googleDriveActionScopes.createComment)
  .input(
    z.object({
      fileId: z.string().describe('ID of the file to comment on'),
      content: z.string().describe('Comment text'),
      anchor: z
        .string()
        .optional()
        .describe('Anchor position in the file (for positioned comments)'),
      quotedFileContent: z
        .object({
          mimeType: z.string().describe('MIME type of the quoted content'),
          value: z.string().describe('Quoted text from the file')
        })
        .optional()
        .describe('Content from the file being quoted')
    })
  )
  .output(commentSchema)
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);
    let comment = await client.createComment(ctx.input.fileId, {
      content: ctx.input.content,
      anchor: ctx.input.anchor,
      quotedFileContent: ctx.input.quotedFileContent
    });

    return {
      output: comment,
      message: `Created comment on file \`${ctx.input.fileId}\`: "${ctx.input.content.substring(0, 80)}${ctx.input.content.length > 80 ? '...' : ''}".`
    };
  })
  .build();

export let replyToCommentTool = SlateTool.create(spec, {
  name: 'Reply to Comment',
  key: 'reply_to_comment',
  description: `Add a reply to an existing comment thread on a file. Can also resolve or reopen the comment thread by setting the action field.`,
  instructions: [
    'Set action to "resolve" to resolve the comment thread, or "reopen" to reopen it. Include a content message with the action.'
  ]
})
  .scopes(googleDriveActionScopes.replyToComment)
  .input(
    z.object({
      fileId: z.string().describe('ID of the file'),
      commentId: z.string().describe('ID of the comment to reply to'),
      content: z.string().describe('Reply text'),
      action: z
        .enum(['resolve', 'reopen'])
        .optional()
        .describe('Resolve or reopen the comment thread')
    })
  )
  .output(replySchema)
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);
    let reply = await client.createReply(ctx.input.fileId, ctx.input.commentId, {
      content: ctx.input.content,
      action: ctx.input.action
    });

    let actionText =
      ctx.input.action === 'resolve'
        ? ' and resolved the thread'
        : ctx.input.action === 'reopen'
          ? ' and reopened the thread'
          : '';
    return {
      output: reply,
      message: `Replied to comment \`${ctx.input.commentId}\`${actionText}.`
    };
  })
  .build();

export let deleteCommentTool = SlateTool.create(spec, {
  name: 'Delete Comment',
  key: 'delete_comment',
  description: `Delete a comment from a file. This removes the comment permanently.`,
  tags: {
    destructive: true
  }
})
  .scopes(googleDriveActionScopes.deleteComment)
  .input(
    z.object({
      fileId: z.string().describe('ID of the file'),
      commentId: z.string().describe('ID of the comment to delete')
    })
  )
  .output(
    z.object({
      fileId: z.string(),
      commentId: z.string(),
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);
    await client.deleteComment(ctx.input.fileId, ctx.input.commentId);

    return {
      output: {
        fileId: ctx.input.fileId,
        commentId: ctx.input.commentId,
        deleted: true
      },
      message: `Deleted comment \`${ctx.input.commentId}\` from file \`${ctx.input.fileId}\`.`
    };
  })
  .build();
