import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let paginationSchema = z.object({
  total: z.number().int().min(0).optional().describe('Total records matching the query'),
  limit: z.number().int().min(0).optional().describe('Maximum records returned in this page'),
  offset: z.number().int().min(0).optional().describe('Number of records skipped'),
  hasMore: z.boolean().optional().describe('Whether additional records are available')
});

export let listObjects = SlateTool.create(spec, {
  name: 'List Objects',
  key: 'list_objects',
  description:
    'List records for a specific item object type such as contacts, companies, or a custom object. Supports pagination, search, sorting, and field-based filters.',
  docs: [
    {
      type: 'docs.action.general',
      name: 'List objects or fetch by ID',
      url: 'https://docs.item.app/api-reference/objects/list-objects-or-fetch-by-id'
    }
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objectType: z
        .string()
        .trim()
        .min(1)
        .describe(
          'Object type slug such as "contacts", "companies", or a custom object slug like "deals"'
        ),
      search: z
        .string()
        .optional()
        .describe('Optional text search against the object name, and email for contacts'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Maximum number of records to return'),
      offset: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Number of records to skip for pagination'),
      sortBy: z.string().optional().describe('Field name to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      filters: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
        .optional()
        .describe(
          'Field-value filters keyed by actual field names, not display labels. Works with system and custom fields. Every entry is sent as filter[field], including name and email, and matches as a case-insensitive partial match, so {"name":"Acme"} also matches "Acme Corporation". Search remains independent. Example: {"name":"Acme","industry":"Technology","score":95}'
        )
    })
  )
  .output(
    z.object({
      objectRecords: z.array(z.record(z.string(), z.any())).describe('Matching item records'),
      pagination: paginationSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listObjects(ctx.input.objectType, {
      search: ctx.input.search,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      filters: ctx.input.filters
    });

    return {
      output: {
        objectRecords: result.data,
        pagination: result.pagination
          ? {
              total: result.pagination.total,
              limit: result.pagination.limit,
              offset: result.pagination.offset,
              hasMore: result.pagination.has_more
            }
          : undefined
      },
      message: `Retrieved **${result.data.length}** record(s) from **${ctx.input.objectType}**.`
    };
  })
  .build();
