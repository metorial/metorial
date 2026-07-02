import { SlateTool } from 'slates';
import { z } from 'zod';
import { GhostAdminClient } from '../lib/client';
import { spec } from '../spec';

let postSchema = z.object({
  postId: z.string().describe('Unique post ID'),
  uuid: z.string().describe('Post UUID'),
  title: z.string().describe('Post title'),
  slug: z.string().describe('URL-friendly slug'),
  status: z.string().describe('Post status: draft, published, or scheduled'),
  visibility: z.string().describe('Post visibility level'),
  featured: z.boolean().describe('Whether the post is featured'),
  excerpt: z.string().nullable().describe('Auto-generated excerpt'),
  customExcerpt: z.string().nullable().describe('Custom excerpt'),
  featureImage: z.string().nullable().describe('Feature image URL'),
  publishedAt: z.string().nullable().describe('Publication timestamp'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp'),
  url: z.string().describe('Full URL of the post'),
  tags: z
    .array(
      z.object({
        tagId: z.string(),
        name: z.string(),
        slug: z.string()
      })
    )
    .optional()
    .describe('Associated tags'),
  authors: z
    .array(
      z.object({
        authorId: z.string(),
        name: z.string(),
        slug: z.string(),
        email: z.string().optional()
      })
    )
    .optional()
    .describe('Post authors')
});

let paginationSchema = z.object({
  page: z.number().describe('Current page'),
  limit: z.number().describe('Items per page'),
  pages: z.number().describe('Total pages'),
  total: z.number().describe('Total items'),
  next: z.number().nullable().describe('Next page number'),
  prev: z.number().nullable().describe('Previous page number')
});

export let browsePosts = SlateTool.create(spec, {
  name: 'Browse Posts',
  key: 'browse_posts',
  description: `List and search posts from your Ghost site. Supports filtering by status, tag, author, visibility and more using Ghost's filter syntax. Returns paginated results with post metadata.`,
  instructions: [
    'Use the **filter** parameter with Ghost NQL syntax, e.g., `status:published`, `tag:getting-started`, `author:ghost`.',
    'Use **include** to embed related resources: `tags`, `authors`, or both: `tags,authors`.',
    'Use **formats** to include content in specific formats: `html`, `lexical`, or `html,lexical`.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      filter: z
        .string()
        .optional()
        .describe(
          'Ghost NQL filter expression (e.g., "status:published", "tag:news+status:published")'
        ),
      include: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of related resources to include (e.g., "tags,authors")'
        ),
      formats: z
        .string()
        .optional()
        .describe('Comma-separated content formats to include (e.g., "html,lexical")'),
      limit: z
        .number()
        .optional()
        .describe('Number of posts per page (default 15, use "all" by setting 0)'),
      page: z.number().optional().describe('Page number for pagination'),
      order: z
        .string()
        .optional()
        .describe('Sort order (e.g., "published_at desc", "title asc")'),
      fields: z.string().optional().describe('Comma-separated list of fields to return')
    })
  )
  .output(
    z.object({
      posts: z.array(postSchema).describe('List of posts'),
      pagination: paginationSchema.describe('Pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GhostAdminClient({
      domain: ctx.config.adminDomain,
      apiKey: ctx.auth.token
    });

    let result = await client.browsePosts({
      filter: ctx.input.filter,
      include: ctx.input.include,
      formats: ctx.input.formats,
      limit: ctx.input.limit,
      page: ctx.input.page,
      order: ctx.input.order,
      fields: ctx.input.fields
    });

    let posts = (result.posts ?? []).map((p: any) => ({
      postId: p.id,
      uuid: p.uuid,
      title: p.title,
      slug: p.slug,
      status: p.status,
      visibility: p.visibility,
      featured: p.featured ?? false,
      excerpt: p.excerpt ?? null,
      customExcerpt: p.custom_excerpt ?? null,
      featureImage: p.feature_image ?? null,
      publishedAt: p.published_at ?? null,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      url: p.url,
      tags: p.tags?.map((t: any) => ({
        tagId: t.id,
        name: t.name,
        slug: t.slug
      })),
      authors: p.authors?.map((a: any) => ({
        authorId: a.id,
        name: a.name,
        slug: a.slug,
        email: a.email
      }))
    }));

    let pagination = result.meta?.pagination ?? {
      page: 1,
      limit: 15,
      pages: 1,
      total: posts.length,
      next: null,
      prev: null
    };

    return {
      output: { posts, pagination },
      message: `Found **${pagination.total}** posts (page ${pagination.page} of ${pagination.pages}).`
    };
  })
  .build();
