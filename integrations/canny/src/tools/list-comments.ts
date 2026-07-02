import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let listCommentsTool = SlateTool.create(spec, {
  name: 'List Comments',
  key: 'list_comments',
  description: `List comments with optional filtering by board, post, author, or company. Uses cursor-based pagination.`,
  constraints: ['Maximum 100 comments per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      boardId: z.string().optional().describe('Filter by board ID'),
      postId: z.string().optional().describe('Filter by post ID'),
      authorId: z.string().optional().describe('Filter by author user ID'),
      companyId: z.string().optional().describe('Filter by company ID'),
      limit: z.number().optional().describe('Number of comments to return (max 100)'),
      cursor: z
        .string()
        .optional()
        .describe('Cursor for pagination (from a previous response)')
    })
  )
  .output(
    z.object({
      comments: z
        .array(
          z.object({
            commentId: z.string().describe('Comment ID'),
            authorName: z.string().describe('Comment author name'),
            authorId: z.string().describe('Comment author ID'),
            value: z.string().describe('Comment text content'),
            internal: z.boolean().describe('Whether the comment is internal-only'),
            parentId: z.string().nullable().describe('Parent comment ID for threaded replies'),
            likeCount: z.number().describe('Number of likes'),
            postId: z.string().describe('Post this comment belongs to'),
            created: z.string().describe('Creation timestamp'),
            imageURLs: z.array(z.string()).describe('Attached image URLs')
          })
        )
        .describe('List of comments'),
      cursor: z.string().nullable().describe('Cursor for fetching the next page'),
      hasNextPage: z.boolean().describe('Whether more comments are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    let result = await client.listComments({
      boardID: ctx.input.boardId,
      postID: ctx.input.postId,
      authorID: ctx.input.authorId,
      companyID: ctx.input.companyId,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let comments = (result.items || []).map((c: any) => ({
      commentId: c.id,
      authorName: c.author?.name,
      authorId: c.author?.id,
      value: c.value,
      internal: c.internal || false,
      parentId: c.parentID || null,
      likeCount: c.likeCount || 0,
      postId: c.post?.id || c.postID,
      created: c.created,
      imageURLs: c.imageURLs || []
    }));

    return {
      output: {
        comments,
        cursor: result.cursor || null,
        hasNextPage: result.hasNextPage
      },
      message: `Found **${comments.length}** comment(s)${result.hasNextPage ? ' (more available)' : ''}.`
    };
  })
  .build();
