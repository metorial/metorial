import { createApiServiceError, SlateTool } from 'slates';
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
  repliesHasNextPage: z
    .boolean()
    .optional()
    .describe('Whether more replies exist beyond this bounded list.'),
  repliesEndCursor: z
    .string()
    .nullable()
    .optional()
    .describe(
      'Native reply cursor. This legacy tool does not fetch subsequent reply pages; use the dashboard for remaining replies.'
    ),
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
  description: `List a page of post comments and up to 20 replies per comment. Reply pagination metadata identifies incomplete reply lists; use the dashboard for remaining replies. Legacy comment and reply write inputs remain accepted for compatibility, but those writes are absent from the current public API and refuse locally.`
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
        .int()
        .min(1)
        .max(100)
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

    if (action !== 'list')
      throw createApiServiceError(
        'Comment and reply writes are unavailable in the current public API. Use the Hashnode dashboard; no request was sent.',
        { reason: 'unsupported_operation' }
      );

    if (action === 'list') {
      if (!ctx.input.postId)
        throw createApiServiceError('postId is required to list comments');

      let result = await client.getComments(ctx.input.postId, {
        first: ctx.input.first,
        after: ctx.input.after
      });

      let comments = result.comments.map(c => ({
        commentId: c.id,
        contentMarkdown: c.content?.markdown,
        contentHtml: c.content?.html,
        authorId: c.author?.id,
        authorUsername: c.author?.username,
        authorName: c.author?.name,
        dateAdded: c.dateAdded,
        totalReactions: c.totalReactions,
        repliesHasNextPage: c.repliesPageInfo?.hasNextPage,
        repliesEndCursor: c.repliesPageInfo?.endCursor,
        replies: (c.replies || []).map(r => ({
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

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
