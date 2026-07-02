import { SlateTool } from 'slates';
import { z } from 'zod';
import { FingertipClient } from '../lib/client';
import { spec } from '../spec';

export let listBlogPosts = SlateTool.create(spec, {
  name: 'List Blog Posts',
  key: 'list_blog_posts',
  description: `List blog posts for a site with sorting and pagination. Returns published post details including title, excerpt, and publication date.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      siteId: z.string().describe('ID of the site to list blog posts for'),
      cursor: z.string().optional().describe('Pagination cursor'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of items per page (default: 10, max: 25)'),
      sortBy: z
        .enum(['createdAt', 'updatedAt', 'publishedAt'])
        .optional()
        .describe('Field to sort by'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      blogPosts: z.array(
        z.object({
          blogPostId: z.string(),
          slug: z.string(),
          title: z.string(),
          excerpt: z.string().nullable(),
          isFeatured: z.boolean(),
          status: z.string(),
          siteId: z.string(),
          publishedAt: z.string().nullable(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      total: z.number(),
      hasNextPage: z.boolean(),
      endCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let result = await client.listBlogPosts({
      siteId: ctx.input.siteId,
      cursor: ctx.input.cursor,
      pageSize: ctx.input.pageSize,
      sortBy: ctx.input.sortBy,
      sortDirection: ctx.input.sortDirection
    });

    let blogPosts = result.items.map(bp => ({
      blogPostId: bp.id,
      slug: bp.slug,
      title: bp.title,
      excerpt: bp.excerpt,
      isFeatured: bp.isFeatured,
      status: bp.status,
      siteId: bp.siteId,
      publishedAt: bp.publishedAt,
      createdAt: bp.createdAt,
      updatedAt: bp.updatedAt
    }));

    return {
      output: {
        blogPosts,
        total: result.total,
        hasNextPage: result.pageInfo.hasNextPage,
        endCursor: result.pageInfo.endCursor
      },
      message: `Found **${result.total}** blog post(s). Returned ${blogPosts.length} on this page.`
    };
  })
  .build();

export let getBlogPost = SlateTool.create(spec, {
  name: 'Get Blog Post',
  key: 'get_blog_post',
  description: `Retrieve a specific blog post's full details including HTML content, featured image, and SEO metadata.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      blogPostId: z.string().describe('ID of the blog post to retrieve')
    })
  )
  .output(
    z.object({
      blogPostId: z.string(),
      slug: z.string(),
      title: z.string(),
      excerpt: z.string().nullable(),
      html: z.string().nullable(),
      featureImageCaption: z.string().nullable(),
      isFeatured: z.boolean(),
      metaTitle: z.string().nullable(),
      metaDescription: z.string().nullable(),
      status: z.string(),
      siteId: z.string(),
      publishedAt: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let post = await client.getBlogPost(ctx.input.blogPostId);

    return {
      output: {
        blogPostId: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        html: post.html,
        featureImageCaption: post.featureImageCaption,
        isFeatured: post.isFeatured,
        metaTitle: post.metaTitle,
        metaDescription: post.metaDescription,
        status: post.status,
        siteId: post.siteId,
        publishedAt: post.publishedAt,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt
      },
      message: `Retrieved blog post **${post.title}**.`
    };
  })
  .build();
