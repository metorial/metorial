import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBulkSearches = SlateTool.create(spec, {
  name: 'List Bulk Searches',
  key: 'list_bulk_searches',
  description:
    'Discover bulk search IDs, progress and statistics. Optionally inspect one bulk search or filter by processing status. Use Get Bulk Search Results with a returned file ID to retrieve its individual results.',
  instructions: [
    'For subsequent pages, pass the returned sorts cursor and set next to true; set next to false to go backward.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      fileId: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Optional bulk search file ID to inspect'),
      status: z
        .enum(['in_progress', 'done'])
        .optional()
        .describe('Filter by processing status'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe('Bulk searches per page (default: 10, maximum: 50)'),
      next: z
        .boolean()
        .optional()
        .describe('Pagination direction: true for next page, false for previous page'),
      sorts: z
        .array(z.any())
        .optional()
        .describe('Pagination cursor returned by a previous request')
    })
  )
  .output(
    z.object({
      files: z
        .array(z.any())
        .describe('Bulk search records with IDs, progress and statistics'),
      sorts: z.array(z.any()).optional().describe('Cursor for another page'),
      total: z.number().optional().describe('Total number of matching bulk searches'),
      raw: z.any().optional().describe('Full provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listBulkSearches(ctx.input);
    let files = result.files || result.items || result.data || [];
    return {
      output: { files, sorts: result.sorts, total: result.total, raw: result },
      message: `Retrieved **${files.length}** bulk search records.`
    };
  })
  .build();
