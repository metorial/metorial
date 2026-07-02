import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, extractPostSummary } from '../lib/helpers';
import { spec } from '../spec';

export let listPostsTool = SlateTool.create(spec, {
  name: 'List Posts',
  key: 'list_posts',
  description: `Retrieve a list of blog posts with filtering options. Filter by status, search term, category, tag, author, and date range. Results are paginated.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .string()
        .optional()
        .describe(
          'Filter by post status (draft, publish, pending, private, future, trash). Defaults to "publish"'
        ),
      search: z.string().optional().describe('Search term to filter posts by'),
      category: z
        .string()
        .optional()
        .describe('Filter by category name (WP.com) or category ID (self-hosted)'),
      tag: z
        .string()
        .optional()
        .describe('Filter by tag name (WP.com) or tag ID (self-hosted)'),
      author: z.string().optional().describe('Filter by author ID'),
      perPage: z
        .number()
        .optional()
        .describe('Number of posts per page (default: 20, max: 100)'),
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      orderBy: z
        .string()
        .optional()
        .describe('Order results by field (date, title, modified, ID)'),
      order: z
        .enum(['ASC', 'DESC'])
        .optional()
        .describe('Sort order (ASC or DESC, default: DESC)'),
      after: z
        .string()
        .optional()
        .describe('Only return posts published after this ISO 8601 date'),
      before: z
        .string()
        .optional()
        .describe('Only return posts published before this ISO 8601 date')
    })
  )
  .output(
    z.object({
      posts: z.array(
        z.object({
          postId: z.string().describe('Unique identifier of the post'),
          title: z.string().describe('Post title'),
          status: z.string().describe('Post status'),
          url: z.string().describe('Public URL'),
          slug: z.string().describe('URL slug'),
          excerpt: z.string().describe('Post excerpt'),
          date: z.string().describe('Publication date'),
          modifiedDate: z.string().describe('Last modified date'),
          authorName: z.string().describe('Author display name'),
          commentCount: z.number().describe('Comment count'),
          likeCount: z.number().describe('Like count'),
          format: z.string().describe('Post format'),
          type: z.string().describe('Content type')
        })
      ),
      count: z.number().describe('Number of posts returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let posts = await client.listPosts(ctx.input);
    let results = posts.map((p: any) => extractPostSummary(p, ctx.config.apiType));
    return {
      output: {
        posts: results,
        count: results.length
      },
      message: `Found **${results.length}** post(s)${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}.`
    };
  })
  .build();

export let getPostTool = SlateTool.create(spec, {
  name: 'Get Post',
  key: 'get_post',
  description: `Retrieve a single blog post by its ID, including full content, metadata, and comment count.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      postId: z.string().describe('ID of the post to retrieve')
    })
  )
  .output(
    z.object({
      postId: z.string().describe('Unique identifier'),
      title: z.string().describe('Post title'),
      content: z.string().describe('Full post content (HTML)'),
      status: z.string().describe('Post status'),
      url: z.string().describe('Public URL'),
      slug: z.string().describe('URL slug'),
      excerpt: z.string().describe('Post excerpt'),
      date: z.string().describe('Publication date'),
      modifiedDate: z.string().describe('Last modified date'),
      authorName: z.string().describe('Author display name'),
      commentCount: z.number().describe('Comment count'),
      likeCount: z.number().describe('Like count'),
      format: z.string().describe('Post format'),
      type: z.string().describe('Content type')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let post = await client.getPost(ctx.input.postId);
    let summary = extractPostSummary(post, ctx.config.apiType);

    let content = '';
    if (ctx.config.apiType === 'wpcom') {
      content = post.content || '';
    } else {
      content = post.content?.rendered || post.content || '';
    }

    return {
      output: {
        ...summary,
        content
      },
      message: `Retrieved post **"${summary.title}"** (${summary.status}). [View post](${summary.url})`
    };
  })
  .build();
