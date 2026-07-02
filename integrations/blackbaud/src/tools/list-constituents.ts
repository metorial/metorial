import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listConstituents = SlateTool.create(spec, {
  name: 'List Constituents',
  key: 'list_constituents',
  description: `List constituent records with optional filtering by date, code, or list. Supports pagination and sorting. Use **Search Constituents** for text-based searches.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Number of records to return (default 500, max 5000).'),
      offset: z.number().optional().describe('Number of records to skip for pagination.'),
      dateAdded: z
        .string()
        .optional()
        .describe('Filter to constituents created on or after this date (ISO 8601).'),
      lastModified: z
        .string()
        .optional()
        .describe('Filter to constituents modified on or after this date (ISO 8601).'),
      sort: z
        .string()
        .optional()
        .describe('Sort fields (comma-separated). Prefix with "-" for descending.'),
      constituentCodeId: z.string().optional().describe('Filter by constituent code ID.'),
      listId: z.string().optional().describe('Filter by list ID.'),
      includeDeceased: z.boolean().optional().describe('Include deceased constituents.'),
      includeInactive: z.boolean().optional().describe('Include inactive constituents.')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of constituents matching the filter.'),
      constituents: z.array(z.any()).describe('Array of constituent records.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subscriptionKey: ctx.auth.subscriptionKey
    });

    let result = await client.listConstituents({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      dateAdded: ctx.input.dateAdded,
      lastModified: ctx.input.lastModified,
      sort: ctx.input.sort,
      constituentCodeId: ctx.input.constituentCodeId,
      constituentListId: ctx.input.listId,
      includeDeceased: ctx.input.includeDeceased,
      includeInactive: ctx.input.includeInactive
    });

    let constituents = result?.value || [];
    let count = result?.count || 0;

    return {
      output: { count, constituents },
      message: `Retrieved **${constituents.length}** of ${count} constituent(s).`
    };
  })
  .build();
