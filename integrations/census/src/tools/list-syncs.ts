import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSyncs = SlateTool.create(spec, {
  name: 'List Syncs',
  key: 'list_syncs',
  description: `Lists all data syncs configured in the Census workspace. Returns sync configurations including source, destination, operation type, schedule, and current status. Use pagination parameters to navigate large lists.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number to return (starts at 1).'),
      perPage: z.number().optional().describe('Number of results per page (max 100).'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order by creation time.')
    })
  )
  .output(
    z.object({
      syncs: z.array(
        z.object({
          syncId: z.number().describe('Unique identifier of the sync.'),
          label: z.string().nullable().describe('Human-readable label for the sync.'),
          status: z
            .string()
            .describe('Current status of the sync (e.g., ready, up to date, failing).'),
          operation: z
            .string()
            .describe('Sync behavior (upsert, update, insert, mirror, append).'),
          paused: z.boolean().describe('Whether the sync is paused.'),
          scheduleFrequency: z
            .string()
            .describe(
              'Schedule frequency (never, continuous, hourly, daily, weekly, expression).'
            ),
          createdAt: z.string().describe('When the sync was created.'),
          updatedAt: z.string().describe('When the sync was last updated.')
        })
      ),
      totalRecords: z.number().optional().describe('Total number of syncs available.'),
      currentPage: z.number().optional().describe('Current page number.'),
      lastPage: z.number().optional().describe('Last page number.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.listSyncs({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      order: ctx.input.order
    });

    let syncs = result.syncs.map(s => ({
      syncId: s.id,
      label: s.label,
      status: s.status,
      operation: s.operation,
      paused: s.paused,
      scheduleFrequency: s.scheduleFrequency,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    }));

    return {
      output: {
        syncs,
        totalRecords: result.pagination?.totalRecords,
        currentPage: result.pagination?.page,
        lastPage: result.pagination?.lastPage
      },
      message: `Found **${syncs.length}** sync(s)${result.pagination ? ` (page ${result.pagination.page} of ${result.pagination.lastPage}, ${result.pagination.totalRecords} total)` : ''}.`
    };
  })
  .build();
