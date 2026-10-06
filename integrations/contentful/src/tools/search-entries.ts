import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, mergeQuery, pageInfo } from '../lib/helpers';
import { limitSchema, pageOutput, resourceId, selection, skipSchema } from '../lib/schemas';
import { spec } from '../spec';

export let searchEntries = SlateTool.create(spec, {
  name: 'Search Entries',
  key: 'search_entries',
  description: `Search and filter entries in a Contentful space. Supports filtering by content type, field values, tags, creation/update dates, and full-text search. Returns paginated results with entry fields, metadata, and linked resources.`,
  instructions: [
    'Use contentTypeId to narrow results to a specific content type.',
    'Query parameters follow Contentful search syntax, e.g. "fields.title[match]=hello" or "sys.createdAt[gte]=2024-01-01".',
    'Use the fullTextSearch parameter for simple keyword searching across all text fields.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ...selection,
      api: z
        .enum(['management', 'delivery', 'preview'])
        .optional()
        .describe(
          'API for legacy token-only connections. Must match the credential type; reconnect if unknown.'
        ),
      contentTypeId: resourceId.optional().describe('Filter entries by content type ID.'),
      fullTextSearch: z
        .string()
        .optional()
        .describe('Full-text search query across all text fields.'),
      queryParams: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Additional Contentful search parameters as key-value pairs, e.g. {"fields.title[match]": "hello", "order": "-sys.createdAt"}.'
        ),
      limit: limitSchema.describe('Max number of entries to return (1-1000, default 100).'),
      skip: skipSchema.describe('Number of entries to skip for pagination.')
    })
  )
  .output(
    z.object({
      ...pageOutput,
      total: z.number().describe('Total number of matching entries.'),
      skip: z.number().describe('Number of entries skipped.'),
      limit: z.number().describe('Max entries returned.'),
      entries: z.array(
        z.object({
          entryId: resourceId,
          contentTypeId: resourceId.optional(),
          fields: z.record(z.string(), z.any()),
          version: z.number().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
          publishedAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth, ctx.input);

    let params: Record<string, string | number | boolean> = {};
    if (ctx.input.contentTypeId) params.content_type = ctx.input.contentTypeId;
    if (ctx.input.fullTextSearch) params.query = ctx.input.fullTextSearch;
    if (ctx.input.limit !== undefined) params.limit = ctx.input.limit;
    if (ctx.input.skip !== undefined) params.skip = ctx.input.skip;
    mergeQuery(params, ctx.input.queryParams);

    let result = await client.getEntries(params);
    let items = result.items;

    let entries = items.map((item: any) => ({
      entryId: item.sys?.id,
      contentTypeId: item.sys?.contentType?.sys?.id,
      fields: item.fields || {},
      version: item.sys?.version,
      createdAt: item.sys?.createdAt,
      updatedAt: item.sys?.updatedAt,
      publishedAt: item.sys?.publishedAt
    }));

    return {
      output: {
        ...pageInfo(result),
        total: result.total,
        skip: result.skip,
        limit: result.limit,
        entries
      },
      message: `Found **${result.total}** entries (showing ${entries.length}).`
    };
  })
  .build();
