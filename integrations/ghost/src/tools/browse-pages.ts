import { SlateTool } from 'slates';
import { z } from 'zod';
import { getClient } from '../lib/client';
import { pagination } from '../lib/schemas';
import { spec } from '../spec';

let pageSchema = z
  .object({
    pageId: z.string().describe('Unique page ID'),
    html: z.string().nullable().optional().describe('Native rendered HTML when requested'),
    lexical: z
      .string()
      .nullable()
      .optional()
      .describe('Native Lexical content, available through Admin'),
    plaintext: z.string().nullable().optional().describe('Native plain text when requested'),
    uuid: z.string().optional().describe('Page UUID'),
    title: z.string().optional().describe('Page title'),
    slug: z.string().optional().describe('URL-friendly slug'),
    status: z.string().optional().describe('Page status: draft, published, or scheduled'),
    visibility: z.string().optional().describe('Page visibility level'),
    featureImage: z.string().nullable().optional().describe('Feature image URL'),
    publishedAt: z.string().nullable().optional().describe('Publication timestamp'),
    createdAt: z.string().optional().describe('Creation timestamp'),
    updatedAt: z.string().optional().describe('Last update timestamp'),
    url: z.string().optional().describe('Full URL of the page'),
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
          slug: z.string()
        })
      )
      .optional()
      .describe('Page authors')
  })
  .partial()
  .required({ pageId: true });

let paginationSchema = z.object({
  page: z.number().optional().describe('Current page'),
  limit: z.number().optional().describe('Items per page'),
  pages: z.number().optional().describe('Total pages'),
  total: z.number().optional().describe('Total items'),
  next: z.number().nullable().optional().describe('Next page number'),
  prev: z.number().nullable().optional().describe('Previous page number')
});

export let browsePages = SlateTool.create(spec, {
  name: 'Browse Pages',
  key: 'browse_pages',
  description: `List and search static pages from your Ghost site. Pages are standalone content (e.g., About, Contact) separate from the blog post feed. Supports filtering, pagination, and including related resources.`,
  instructions: [
    'Use **include** to embed related resources: `tags`, `authors`, or `tags,authors`.',
    'Use **filter** with Ghost NQL syntax, e.g., `status:published`, `tag:about`.'
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
      filter: z.string().optional().describe('Ghost NQL filter expression'),
      include: z
        .string()
        .optional()
        .describe('Comma-separated list of related resources to include'),
      formats: z.string().optional().describe('Comma-separated content formats to include'),
      limit: z.number().optional().describe('Number of pages per page (default 15)'),
      page: z.number().optional().describe('Page number for pagination'),
      order: z.string().optional().describe('Sort order (e.g., "title asc")')
    })
  )
  .output(
    z.object({
      pages: z.array(pageSchema).describe('List of pages'),
      pagination: paginationSchema.describe('Pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = getClient(ctx, ctx.input.api);

    let result = await client.browsePages({
      filter: ctx.input.filter,
      include: ctx.input.include,
      formats: ctx.input.formats,
      limit: ctx.input.limit,
      page: ctx.input.page,
      order: ctx.input.order
    });

    let pages = (result.pages ?? []).map((p: any) => ({
      pageId: p.id,
      uuid: p.uuid,
      html: p.html,
      lexical: p.lexical,
      plaintext: p.plaintext,
      title: p.title,
      slug: p.slug,
      status: p.status,
      visibility: p.visibility,
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
        slug: a.slug
      }))
    }));

    let pageInfo = pagination(result, pages.length);

    return {
      output: { pages, pagination: pageInfo },
      message: `Found **${pageInfo.total}** pages (page ${pageInfo.page} of ${pageInfo.pages}).`
    };
  })
  .build();
