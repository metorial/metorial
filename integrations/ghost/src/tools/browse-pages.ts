import { SlateTool } from 'slates';
import { z } from 'zod';
import { GhostAdminClient } from '../lib/client';
import { spec } from '../spec';

let pageSchema = z.object({
  pageId: z.string().describe('Unique page ID'),
  uuid: z.string().describe('Page UUID'),
  title: z.string().describe('Page title'),
  slug: z.string().describe('URL-friendly slug'),
  status: z.string().describe('Page status: draft, published, or scheduled'),
  visibility: z.string().describe('Page visibility level'),
  featureImage: z.string().nullable().describe('Feature image URL'),
  publishedAt: z.string().nullable().describe('Publication timestamp'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp'),
  url: z.string().describe('Full URL of the page'),
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
        slug: z.string()
      })
    )
    .optional()
    .describe('Page authors')
});

let paginationSchema = z.object({
  page: z.number().describe('Current page'),
  limit: z.number().describe('Items per page'),
  pages: z.number().describe('Total pages'),
  total: z.number().describe('Total items'),
  next: z.number().nullable().describe('Next page number'),
  prev: z.number().nullable().describe('Previous page number')
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
    let client = new GhostAdminClient({
      domain: ctx.config.adminDomain,
      apiKey: ctx.auth.token
    });

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
      title: p.title,
      slug: p.slug,
      status: p.status,
      visibility: p.visibility,
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
        slug: a.slug
      }))
    }));

    let pagination = result.meta?.pagination ?? {
      page: 1,
      limit: 15,
      pages: 1,
      total: pages.length,
      next: null,
      prev: null
    };

    return {
      output: { pages, pagination },
      message: `Found **${pagination.total}** pages (page ${pagination.page} of ${pagination.pages}).`
    };
  })
  .build();
