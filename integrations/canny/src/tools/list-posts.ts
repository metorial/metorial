import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let listPostsTool = SlateTool.create(spec, {
  name: 'List Posts',
  key: 'list_posts',
  description: `List and search feedback posts with flexible filtering. Filter by board, author, company, tags, status, or search by keyword. Supports pagination and sorting.`,
  instructions: [
    'Use `sort` to control ordering: "newest", "oldest", "relevance" (when searching), "score", "statusChanged", or "trending".',
    'Combine filters (e.g., boardId + status + tagIds) to narrow results.'
  ],
  constraints: ['Maximum 100 posts per request (default 10).'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      boardId: z.string().optional().describe('Filter by board ID'),
      authorId: z.string().optional().describe('Filter by author user ID'),
      companyId: z.string().optional().describe('Filter by company ID'),
      tagIds: z.array(z.string()).optional().describe('Filter by tag IDs'),
      status: z
        .string()
        .optional()
        .describe(
          'Filter by status (open, under review, planned, in progress, complete, closed)'
        ),
      search: z.string().optional().describe('Search keyword in post titles and details'),
      sort: z
        .enum(['newest', 'oldest', 'relevance', 'score', 'statusChanged', 'trending'])
        .optional()
        .describe('Sort order'),
      limit: z.number().optional().describe('Number of posts to return (max 100, default 10)'),
      skip: z.number().optional().describe('Number of posts to skip for pagination')
    })
  )
  .output(
    z.object({
      posts: z
        .array(
          z.object({
            postId: z.string().describe('Unique identifier of the post'),
            title: z.string().describe('Title of the post'),
            details: z.string().nullable().describe('Body of the post'),
            status: z.string().describe('Current status'),
            score: z.number().describe('Vote score'),
            commentCount: z.number().describe('Number of comments'),
            boardName: z.string().describe('Board name'),
            authorName: z.string().describe('Author name'),
            url: z.string().describe('Post URL'),
            created: z.string().describe('Creation timestamp')
          })
        )
        .describe('List of posts'),
      hasMore: z.boolean().describe('Whether there are more posts available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    let result = await client.listPosts({
      boardID: ctx.input.boardId,
      authorID: ctx.input.authorId,
      companyID: ctx.input.companyId,
      tagIDs: ctx.input.tagIds,
      status: ctx.input.status,
      search: ctx.input.search,
      sort: ctx.input.sort,
      limit: ctx.input.limit,
      skip: ctx.input.skip
    });

    let posts = (result.posts || []).map((p: any) => ({
      postId: p.id,
      title: p.title,
      details: p.details,
      status: p.status,
      score: p.score,
      commentCount: p.commentCount,
      boardName: p.board?.name,
      authorName: p.author?.name,
      url: p.url,
      created: p.created
    }));

    return {
      output: { posts, hasMore: result.hasMore },
      message: `Found **${posts.length}** post(s)${result.hasMore ? ' (more available)' : ''}.`
    };
  })
  .build();
