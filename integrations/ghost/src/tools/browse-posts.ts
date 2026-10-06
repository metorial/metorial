import { SlateTool } from 'slates';
import { z } from 'zod';
import { getClient } from '../lib/client';
import { pagination } from '../lib/schemas';
import { spec } from '../spec';

let postSchema = z
  .object({
    postId: z.string().describe('Unique post ID'),
    html: z.string().nullable().optional().describe('Native rendered HTML when requested'),
    lexical: z
      .string()
      .nullable()
      .optional()
      .describe('Native Lexical content, available through Admin'),
    plaintext: z.string().nullable().optional().describe('Native plain text when requested'),
    uuid: z.string().optional().describe('Post UUID'),
    title: z.string().optional().describe('Post title'),
    slug: z.string().optional().describe('URL-friendly slug'),
    status: z.string().optional().describe('Post status: draft, published, or scheduled'),
    visibility: z.string().optional().describe('Post visibility level'),
    featured: z.boolean().optional().describe('Whether the post is featured'),
    excerpt: z.string().nullable().optional().describe('Auto-generated excerpt'),
    customExcerpt: z.string().nullable().optional().describe('Custom excerpt'),
    featureImage: z.string().nullable().optional().describe('Feature image URL'),
    publishedAt: z.string().nullable().optional().describe('Publication timestamp'),
    createdAt: z.string().optional().describe('Creation timestamp'),
    updatedAt: z.string().optional().describe('Last update timestamp'),
    url: z.string().optional().describe('Full URL of the post'),
    tags: z
      .array(
        z.object({
          api: z
            .enum(['admin', 'content'])
            .optional()
            .describe(
              'Read through Admin or published Content API. Writes require Admin. Defaults to the connection type.'
            ),
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
  })
  .partial()
  .required({ postId: true });

let paginationSchema = z.object({
  page: z.number().optional().describe('Current page'),
  limit: z.number().optional().describe('Items per page'),
  pages: z.number().optional().describe('Total pages'),
  total: z.number().optional().describe('Total items'),
  next: z.number().nullable().optional().describe('Next page number'),
  prev: z.number().nullable().optional().describe('Previous page number')
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
      api: z
        .enum(['admin', 'content'])
        .optional()
        .describe(
          'Select Admin or published Content API. Defaults to the connection credential type.'
        ),
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
    let client = getClient(ctx, ctx.input.api);

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
      html: p.html,
      lexical: p.lexical,
      plaintext: p.plaintext,
      title: p.title,
      slug: p.slug,
      status: p.status,
      visibility: p.visibility,
      featured: p.featured,
      excerpt: p.excerpt,
      customExcerpt: p.custom_excerpt,
      featureImage: p.feature_image,
      publishedAt: p.published_at,
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

    let pageInfo = pagination(result, posts.length);

    return {
      output: { posts, pagination: pageInfo },
      message: `Found **${pageInfo.total}** posts (page ${pageInfo.page} of ${pageInfo.pages}).`
    };
  })
  .build();
