import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listBlogPosts = SlateTool.create(spec, {
  name: 'List Blog Posts',
  key: 'list_blog_posts',
  description: `List Confluence blog posts, optionally filtered by space or title. Returns blog post metadata for each result.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      spaceId: z.string().optional().describe('Filter blog posts by space ID'),
      title: z.string().optional().describe('Filter by exact title'),
      status: z.string().optional().describe('Filter by status (current, draft, trashed)'),
      limit: z.number().optional().default(25).describe('Maximum number of results'),
      cursor: z.string().optional().describe('Pagination cursor'),
      sort: z.string().optional().describe('Sort order (e.g., "-modified-date")')
    })
  )
  .output(
    z.object({
      blogPosts: z.array(
        z.object({
          blogPostId: z.string(),
          title: z.string(),
          status: z.string(),
          spaceId: z.string().optional(),
          versionNumber: z.number().optional(),
          createdAt: z.string().optional()
        })
      ),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let response = await client.getBlogPosts({
      spaceId: ctx.input.spaceId,
      title: ctx.input.title,
      status: ctx.input.status,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      sort: ctx.input.sort
    });

    let nextLink = response._links?.next;
    let nextCursor: string | undefined;
    if (nextLink) {
      let match = nextLink.match(/cursor=([^&]+)/);
      if (match) nextCursor = decodeURIComponent(match[1]!);
    }

    let blogPosts = response.results.map(b => ({
      blogPostId: b.id,
      title: b.title,
      status: b.status,
      spaceId: b.spaceId,
      versionNumber: b.version?.number,
      createdAt: b.createdAt
    }));

    return {
      output: { blogPosts, nextCursor },
      message: `Found **${blogPosts.length}** blog posts`
    };
  })
  .build();

export let getBlogPost = SlateTool.create(spec, {
  name: 'Get Blog Post',
  key: 'get_blog_post',
  description: `Retrieve a single Confluence blog post by ID with optional body content.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      blogPostId: z.string().describe('The blog post ID'),
      includeBody: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include the body content')
    })
  )
  .output(
    z.object({
      blogPostId: z.string(),
      title: z.string(),
      status: z.string(),
      spaceId: z.string().optional(),
      authorId: z.string().optional(),
      createdAt: z.string().optional(),
      versionNumber: z.number().optional(),
      body: z.string().optional(),
      webUrl: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let bp = await client.getBlogPostById(ctx.input.blogPostId, ctx.input.includeBody);

    return {
      output: {
        blogPostId: bp.id,
        title: bp.title,
        status: bp.status,
        spaceId: bp.spaceId,
        authorId: bp.authorId,
        createdAt: bp.createdAt,
        versionNumber: bp.version?.number,
        body: bp.body?.storage?.value,
        webUrl: bp._links?.webui
      },
      message: `Retrieved blog post **${bp.title}** (ID: ${bp.id})`
    };
  })
  .build();

export let createBlogPost = SlateTool.create(spec, {
  name: 'Create Blog Post',
  key: 'create_blog_post',
  description: `Create a new blog post in a Confluence space. The body should be in Confluence storage format (XHTML-based).`,
  tags: { destructive: false }
})
  .input(
    z.object({
      spaceId: z.string().describe('The space ID to create the blog post in'),
      title: z.string().describe('The blog post title'),
      body: z.string().describe('Blog post body in Confluence storage format'),
      status: z
        .enum(['current', 'draft'])
        .optional()
        .default('current')
        .describe('Blog post status')
    })
  )
  .output(
    z.object({
      blogPostId: z.string(),
      title: z.string(),
      status: z.string(),
      spaceId: z.string().optional(),
      versionNumber: z.number().optional(),
      webUrl: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let bp = await client.createBlogPost({
      spaceId: ctx.input.spaceId,
      title: ctx.input.title,
      body: ctx.input.body,
      status: ctx.input.status
    });

    return {
      output: {
        blogPostId: bp.id,
        title: bp.title,
        status: bp.status,
        spaceId: bp.spaceId,
        versionNumber: bp.version?.number,
        webUrl: bp._links?.webui
      },
      message: `Created blog post **${bp.title}** (ID: ${bp.id})`
    };
  })
  .build();

export let updateBlogPost = SlateTool.create(spec, {
  name: 'Update Blog Post',
  key: 'update_blog_post',
  description: `Update an existing Confluence blog post's title, body, or status. Requires the current version number.`,
  instructions: ['Retrieve the blog post first to get the current version number.'],
  tags: { destructive: false }
})
  .input(
    z.object({
      blogPostId: z.string().describe('The blog post ID to update'),
      title: z.string().optional().describe('New title'),
      body: z.string().optional().describe('New body in Confluence storage format'),
      versionNumber: z.coerce
        .number()
        .describe('Current version number (will be incremented)'),
      status: z.enum(['current', 'draft']).optional().describe('New status')
    })
  )
  .output(
    z.object({
      blogPostId: z.string(),
      title: z.string(),
      status: z.string(),
      versionNumber: z.number().optional(),
      webUrl: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let bp = await client.updateBlogPost(ctx.input.blogPostId, {
      title: ctx.input.title,
      body: ctx.input.body,
      version: ctx.input.versionNumber + 1,
      status: ctx.input.status
    });

    return {
      output: {
        blogPostId: bp.id,
        title: bp.title,
        status: bp.status,
        versionNumber: bp.version?.number,
        webUrl: bp._links?.webui
      },
      message: `Updated blog post **${bp.title}** to version ${bp.version?.number || 'unknown'}`
    };
  })
  .build();

export let deleteBlogPost = SlateTool.create(spec, {
  name: 'Delete Blog Post',
  key: 'delete_blog_post',
  description: `Delete a Confluence blog post by ID (moves to trash).`,
  tags: { destructive: true }
})
  .input(
    z.object({
      blogPostId: z.string().describe('The blog post ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    await client.deleteBlogPost(ctx.input.blogPostId);

    return {
      output: { deleted: true },
      message: `Deleted blog post ${ctx.input.blogPostId} (moved to trash)`
    };
  })
  .build();
