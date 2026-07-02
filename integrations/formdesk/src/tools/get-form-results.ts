import { SlateTool } from 'slates';
import { z } from 'zod';
import { FormdeskClient } from '../lib/client';
import { spec } from '../spec';

export let getFormResults = SlateTool.create(spec, {
  name: 'Get Form Results',
  key: 'get_form_results',
  description: `Retrieves a list of form submission result IDs for a given form. Supports extensive filtering by date ranges (created, changed, completed), status, sync status, visitor, and pre-defined filters. Use the returned result IDs with the **Get Result Details** tool to fetch full submission data.`,
  instructions: [
    'Date parameters should be in ISO 8601 format (e.g., 2024-01-15T00:00:00).',
    'Use syncStatus "unprocessed" to retrieve only results that have not yet been marked as processed.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formName: z.string().describe('Name or identifier of the form to query'),
      createdAfter: z
        .string()
        .optional()
        .describe('Only return results created after this date (ISO 8601)'),
      createdBefore: z
        .string()
        .optional()
        .describe('Only return results created before this date (ISO 8601)'),
      changedAfter: z
        .string()
        .optional()
        .describe('Only return results changed after this date (ISO 8601)'),
      changedBefore: z
        .string()
        .optional()
        .describe('Only return results changed before this date (ISO 8601)'),
      completedAfter: z
        .string()
        .optional()
        .describe('Only return results completed after this date (ISO 8601)'),
      completedBefore: z
        .string()
        .optional()
        .describe('Only return results completed before this date (ISO 8601)'),
      status: z.string().optional().describe('Filter by result status'),
      syncStatus: z
        .enum(['all', 'unprocessed', 'processed'])
        .optional()
        .describe('Filter by synchronization status'),
      visitorId: z.string().optional().describe('Filter results by visitor ID'),
      filterName: z.string().optional().describe('Name of a pre-defined filter to apply'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      resultIds: z
        .array(z.string())
        .describe('List of result entry IDs matching the query criteria'),
      totalCount: z
        .number()
        .optional()
        .describe('Total number of matching results if provided by the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FormdeskClient({
      token: ctx.auth.token,
      host: ctx.auth.host,
      domain: ctx.auth.domain
    });

    ctx.progress('Fetching form result IDs...');
    let data = await client.getResultIDs({
      formName: ctx.input.formName,
      createdAfter: ctx.input.createdAfter,
      createdBefore: ctx.input.createdBefore,
      changedAfter: ctx.input.changedAfter,
      changedBefore: ctx.input.changedBefore,
      completedAfter: ctx.input.completedAfter,
      completedBefore: ctx.input.completedBefore,
      status: ctx.input.status,
      syncStatus: ctx.input.syncStatus,
      visitorId: ctx.input.visitorId,
      filter: ctx.input.filterName,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let resultIds: string[] = [];
    if (Array.isArray(data)) {
      resultIds = data.map((r: any) => String(r.id || r));
    } else if (data?.results) {
      resultIds = data.results.map((r: any) => String(r.id || r));
    }

    return {
      output: {
        resultIds,
        totalCount: data?.total || undefined
      },
      message: `Found **${resultIds.length}** result(s) for form "${ctx.input.formName}".`
    };
  })
  .build();
