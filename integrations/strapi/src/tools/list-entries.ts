import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEntries = SlateTool.create(spec, {
  name: 'List Entries',
  key: 'list_entries',
  description: `Retrieve a paginated list of entries from any Strapi content type. Supports filtering by field values, sorting, field selection, relation population, locale, and draft/published status.`,
  instructions: [
    'The contentType must be the plural API ID of the content type (e.g., "articles", "restaurants").',
    'Use filters with Strapi filter operators like $eq, $contains, $gt, etc. nested under the field name.',
    'Use sort with field names and optional :asc or :desc suffix (e.g., "createdAt:desc").',
    'Set populate to "*" to populate all relations, or specify individual relation names.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contentType: z
        .string()
        .describe('Plural API ID of the content type (e.g., "articles", "products")'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Specific fields to return (e.g., ["title", "description"])'),
      populate: z
        .union([z.string(), z.record(z.string(), z.any())])
        .optional()
        .describe('Relations to populate. Use "*" for all, or an object for granular control'),
      filters: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Filter criteria using Strapi operators (e.g., {"title": {"$contains": "hello"}})'
        ),
      sort: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Sort order (e.g., "createdAt:desc" or ["title:asc", "createdAt:desc"])'),
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      pageSize: z.number().optional().describe('Number of entries per page (default: 25)'),
      status: z
        .enum(['draft', 'published'])
        .optional()
        .describe('Filter by publication status (requires Draft & Publish enabled)'),
      locale: z.string().optional().describe('Locale code for i18n content (e.g., "en", "fr")')
    })
  )
  .output(
    z.object({
      entries: z.array(z.record(z.string(), z.any())).describe('List of content entries'),
      pagination: z
        .object({
          page: z.number().optional(),
          pageSize: z.number().optional(),
          pageCount: z.number().optional(),
          total: z.number().optional()
        })
        .optional()
        .describe('Pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.listEntries(ctx.input.contentType, {
      fields: ctx.input.fields,
      populate: ctx.input.populate,
      filters: ctx.input.filters,
      sort: ctx.input.sort,
      pagination: {
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      },
      status: ctx.input.status,
      locale: ctx.input.locale
    });

    let total = result.meta?.pagination?.total;
    let count = result.data?.length ?? 0;

    return {
      output: {
        entries: result.data,
        pagination: result.meta?.pagination
          ? {
              page: result.meta.pagination.page,
              pageSize: result.meta.pagination.pageSize,
              pageCount: result.meta.pagination.pageCount,
              total: result.meta.pagination.total
            }
          : undefined
      },
      message: `Retrieved **${count}** entries from **${ctx.input.contentType}**${total !== undefined ? ` (${total} total)` : ''}.`
    };
  })
  .build();
