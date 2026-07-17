import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { confluenceServiceError } from '../lib/errors';
import { createClient, resolveContentIdAlias, resolveLimitAlias } from '../lib/helpers';
import { spec } from '../spec';

export let getComments = SlateTool.create(spec, {
  name: 'Get Comments',
  key: 'get_comments',
  description: `Retrieve footer comments on a Confluence page. Returns comment metadata and body content.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      pageId: z
        .string()
        .optional()
        .describe('The page ID to get comments for. Use this field for new calls.'),
      contentId: z
        .string()
        .optional()
        .describe('Compatibility alias for pageId, used only when pageId is omitted.'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of comments. Defaults to 25 when omitted.'),
      maxResults: z
        .number()
        .optional()
        .describe(
          'Compatibility alias for limit, used only when limit is omitted. Defaults to 25 when both fields are omitted.'
        ),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      comments: z.array(
        z.object({
          commentId: z.string(),
          status: z.string(),
          authorId: z.string().optional(),
          createdAt: z.string().optional(),
          body: z.string().optional(),
          versionNumber: z.number().optional()
        })
      ),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let pageId = resolveContentIdAlias(ctx.input);
    if (!pageId) {
      throw confluenceServiceError('Provide a pageId or contentId to get comments.');
    }

    let client = createClient(ctx.auth, ctx.config);
    let response = await client.getPageFooterComments(pageId, {
      limit: resolveLimitAlias(ctx.input),
      cursor: ctx.input.cursor
    });

    let nextLink = response._links?.next;
    let nextCursor: string | undefined;
    if (nextLink) {
      let match = nextLink.match(/cursor=([^&]+)/);
      if (match) nextCursor = decodeURIComponent(match[1]!);
    }

    let comments = response.results.map(c => ({
      commentId: c.id,
      status: c.status,
      authorId: c.authorId,
      createdAt: c.createdAt,
      body: c.body?.storage?.value,
      versionNumber: c.version?.number
    }));

    return {
      output: { comments, nextCursor },
      message: `Found **${comments.length}** comments on page ${pageId}`
    };
  })
  .build();

export let addComment = SlateTool.create(spec, {
  name: 'Add Comment',
  key: 'add_comment',
  description: `Add a footer comment to a Confluence page or blog post. The body should be in Confluence storage format.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      contentType: z
        .enum(['page', 'blogpost'])
        .describe('Whether to comment on a page or blog post'),
      contentId: z.string().describe('The page or blog post ID to comment on'),
      body: z.string().describe('Comment body in Confluence storage format')
    })
  )
  .output(
    z.object({
      commentId: z.string(),
      status: z.string(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let comment: any;

    if (ctx.input.contentType === 'page') {
      comment = await client.createPageFooterComment(ctx.input.contentId, ctx.input.body);
    } else {
      comment = await client.createBlogPostFooterComment(ctx.input.contentId, ctx.input.body);
    }

    return {
      output: {
        commentId: comment.id,
        status: comment.status,
        createdAt: comment.createdAt
      },
      message: `Added comment (ID: ${comment.id}) to ${ctx.input.contentType} ${ctx.input.contentId}`
    };
  })
  .build();

export let deleteComment = SlateTool.create(spec, {
  name: 'Delete Comment',
  key: 'delete_comment',
  description: `Delete a footer comment by ID.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      commentId: z.string().describe('The comment ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    await client.deleteFooterComment(ctx.input.commentId);

    return {
      output: { deleted: true },
      message: `Deleted comment ${ctx.input.commentId}`
    };
  })
  .build();
