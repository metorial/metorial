import { SlateTool } from 'slates';
import { z } from 'zod';
import { CountdownClient } from '../lib/client';
import { spec } from '../spec';

export let listCollections = SlateTool.create(spec, {
  name: 'List Collections',
  key: 'list_collections',
  description: `List and search through bulk request collections. Supports filtering by status, name, creation date, last run date, and destination. Returns paginated collection summaries with schedule and notification settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['all', 'idle', 'queued', 'running'])
        .optional()
        .describe('Filter collections by status.'),
      searchTerm: z.string().optional().describe('Search collections by name.'),
      searchType: z
        .enum(['contains', 'starts_with', 'ends_with', 'exact'])
        .optional()
        .describe('Search behavior for name matching.'),
      onlyWithResults: z
        .boolean()
        .optional()
        .describe('Only return collections that have result sets.'),
      onlyWithoutResults: z
        .boolean()
        .optional()
        .describe('Only return collections without result sets.'),
      createdBefore: z
        .string()
        .optional()
        .describe('ISO 8601 UTC timestamp filter for creation date.'),
      createdAfter: z
        .string()
        .optional()
        .describe('ISO 8601 UTC timestamp filter for creation date.'),
      lastRunBefore: z
        .string()
        .optional()
        .describe('ISO 8601 UTC timestamp filter for last run date.'),
      lastRunAfter: z
        .string()
        .optional()
        .describe('ISO 8601 UTC timestamp filter for last run date.'),
      destinationId: z.string().optional().describe('Filter by destination ID.'),
      page: z.number().optional().describe('Page number (defaults to 1).'),
      pageSize: z.number().optional().describe('Results per page (default 25, max 1000).'),
      sortBy: z
        .enum(['created_at', 'last_run', 'name', 'priority', 'status'])
        .optional()
        .describe('Sort field.'),
      sortDirection: z.enum(['ascending', 'descending']).optional().describe('Sort direction.')
    })
  )
  .output(
    z.object({
      collections: z.array(z.any()).describe('Array of collection objects.'),
      totalCount: z
        .number()
        .optional()
        .describe('Total number of collections matching the filter.'),
      totalPages: z.number().optional().describe('Total number of pages.'),
      currentPage: z.number().optional().describe('Current page number.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CountdownClient({ token: ctx.auth.token });

    let result = await client.listCollections({
      status: ctx.input.status,
      searchTerm: ctx.input.searchTerm,
      searchType: ctx.input.searchType,
      onlyWithResults: ctx.input.onlyWithResults,
      onlyWithoutResults: ctx.input.onlyWithoutResults,
      createdBefore: ctx.input.createdBefore,
      createdAfter: ctx.input.createdAfter,
      lastRunBefore: ctx.input.lastRunBefore,
      lastRunAfter: ctx.input.lastRunAfter,
      destinationId: ctx.input.destinationId,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      sortBy: ctx.input.sortBy,
      sortDirection: ctx.input.sortDirection
    });

    let collections = result.collections || [];

    return {
      output: {
        collections,
        totalCount: result.total_count,
        totalPages: result.total_pages,
        currentPage: result.current_page
      },
      message: `Found **${collections.length}** collections${result.total_count ? ` (${result.total_count} total)` : ''}.`
    };
  })
  .build();
