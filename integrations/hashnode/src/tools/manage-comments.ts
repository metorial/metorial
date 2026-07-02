import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let commentSchema = z.object({
  commentId: z.string().describe('Comment ID'),
  contentMarkdown: z.string().nullable().optional().describe('Comment content in Markdown'),
  contentHtml: z.string().nullable().optional().describe('Comment content in HTML'),
  authorId: z.string().nullable().optional(),
  authorUsername: z.string().nullable().optional(),
  authorName: z.string().nullable().optional(),
  dateAdded: z.string().nullable().optional().describe('When the comment was posted'),
  totalReactions: z.number().nullable().optional(),
  replies: z
    .array(
      z.object({
        replyId: z.string(),
        contentMarkdown: z.string().nullable().optional(),
        contentHtml: z.string().nullable().optional(),
        authorUsername: z.string().nullable().optional(),
        authorName: z.string().nullable().optional(),
        dateAdded: z.string().nullable().optional(),
        totalReactions: z.number().nullable().optional()
      })
    )
    .optional()
    .describe('Replies to this comment')
});

export let manageComments = SlateTool.create(spec, {
  name: 'Manage Comments',
  key: 'manage_comments',
  description: `Interact with comments on blog posts. Supports listing comments, adding comments, replying to comments, and deleting comments or replies.
- **list**: Get all comments on a post with their replies.
- **add**: Add a new comment to a post.
- **reply**: Reply to an existing comment.
- **delete_comment**: Remove a comment.
- **delete_reply**: Remove a reply from a comment.`
})
  .input(
    z.object({
      action: z
        .enum(['list', 'add', 'reply', 'delete_comment', 'delete_reply'])
        .describe('Operation to perform'),
      postId: z.string().optional().describe('Post ID — required for "list" and "add"'),
      commentId: z
        .string()
        .optional()
        .describe('Comment ID — required for "reply", "delete_comment", and "delete_reply"'),
      replyId: z.string().optional().describe('Reply ID — required for "delete_reply"'),
      contentMarkdown: z
        .string()
        .optional()
        .describe('Comment/reply content in Markdown — required for "add" and "reply"'),
      first: z
        .number()
        .optional()
        .default(10)
        .describe('Number of comments to return — used with "list"'),
      after: z.string().optional().describe('Pagination cursor — used with "list"')
    })
  )
  .output(
    z.object({
      comment: commentSchema
        .nullable()
        .optional()
        .describe('Single comment — returned by "add"'),
      reply: z
        .object({
          replyId: z.string(),
          contentMarkdown: z.string().nullable().optional(),
          contentHtml: z.string().nullable().optional(),
          authorUsername: z.string().nullable().optional(),
          authorName: z.string().nullable().optional(),
          dateAdded: z.string().nullable().optional()
        })
        .nullable()
        .optional()
        .describe('Single reply — returned by "reply"'),
      comments: z
        .array(commentSchema)
        .nullable()
        .optional()
        .describe('List of comments — returned by "list"'),
      hasNextPage: z.boolean().optional(),
      endCursor: z.string().nullable().optional(),
      totalDocuments: z.number().nullable().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      publicationHost: ctx.config.publicationHost
    });

    let { action } = ctx.input;

    if (action === 'list') {
      if (!ctx.input.postId) throw new Error('postId is required to list comments');

      let result = await client.getComments(ctx.input.postId, {
        first: Math.min(ctx.input.first, 20),
        after: ctx.input.after
      });

      let comments = result.comments.map((c: any) => ({
        commentId: c.id,
        contentMarkdown: c.content?.markdown,
        contentHtml: c.content?.html,
        authorId: c.author?.id,
        authorUsername: c.author?.username,
        authorName: c.author?.name,
        dateAdded: c.dateAdded,
        totalReactions: c.totalReactions,
        replies: (c.replies || []).map((r: any) => ({
          replyId: r.id,
          contentMarkdown: r.content?.markdown,
          contentHtml: r.content?.html,
          authorUsername: r.author?.username,
          authorName: r.author?.name,
          dateAdded: r.dateAdded,
          totalReactions: r.totalReactions
        }))
      }));

      return {
        output: {
          comments,
          hasNextPage: result.pageInfo?.hasNextPage ?? false,
          endCursor: result.pageInfo?.endCursor,
          totalDocuments: result.totalDocuments
        },
        message: `Found **${comments.length}** comments${result.totalDocuments ? ` (${result.totalDocuments} total)` : ''}`
      };
    }

    if (action === 'add') {
      if (!ctx.input.postId) throw new Error('postId is required to add a comment');
      if (!ctx.input.contentMarkdown) throw new Error('contentMarkdown is required');

      let comment = await client.addComment(ctx.input.postId, ctx.input.contentMarkdown);

      return {
        output: {
          comment: {
            commentId: comment.id,
            contentMarkdown: comment.content?.markdown,
            contentHtml: comment.content?.html,
            authorId: comment.author?.id,
            authorUsername: comment.author?.username,
            authorName: comment.author?.name,
            dateAdded: comment.dateAdded
          }
        },
        message: `Added comment by **${comment.author?.username || 'unknown'}**`
      };
    }

    if (action === 'reply') {
      if (!ctx.input.commentId) throw new Error('commentId is required to reply');
      if (!ctx.input.contentMarkdown) throw new Error('contentMarkdown is required');

      let reply = await client.addReply(ctx.input.commentId, ctx.input.contentMarkdown);

      return {
        output: {
          reply: {
            replyId: reply.id,
            contentMarkdown: reply.content?.markdown,
            contentHtml: reply.content?.html,
            authorUsername: reply.author?.username,
            authorName: reply.author?.name,
            dateAdded: reply.dateAdded
          }
        },
        message: `Added reply by **${reply.author?.username || 'unknown'}**`
      };
    }

    if (action === 'delete_comment') {
      if (!ctx.input.commentId) throw new Error('commentId is required to delete a comment');

      await client.removeComment(ctx.input.commentId);

      return {
        output: { deleted: true },
        message: `Deleted comment \`${ctx.input.commentId}\``
      };
    }

    if (action === 'delete_reply') {
      if (!ctx.input.commentId) throw new Error('commentId is required to delete a reply');
      if (!ctx.input.replyId) throw new Error('replyId is required to delete a reply');

      await client.removeReply(ctx.input.commentId, ctx.input.replyId);

      return {
        output: { deleted: true },
        message: `Deleted reply \`${ctx.input.replyId}\``
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
