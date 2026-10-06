import { SlateTool } from 'slates';
import { z } from 'zod';
import { workspaceClient } from '../lib/client';
import { allPages, workspaceId } from '../lib/schemas';
import { spec } from '../spec';

export let listSyncs = SlateTool.create(spec, {
  name: 'List Syncs',
  key: 'list_syncs',
  description: `Lists a page of sync configurations in the authenticated workspace. Set allPages to follow the complete documented pagination chain. Returns sync configurations including source, destination, operation type, schedule, and current status. Use pagination parameters to navigate large lists.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId,
      allPages,
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
          label: z.string().nullish().describe('Human-readable label for the sync.'),
          status: z
            .string()
            .describe('Current status of the sync (e.g., ready, up to date, failing).'),
          operation: z
            .string()
            .describe('Sync behavior (upsert, update, insert, mirror, append).'),
          paused: z.boolean().optional().describe('Whether the sync is paused.'),
          scheduleFrequency: z
            .string()
            .optional()
            .describe(
              'Schedule frequency (never, continuous, hourly, daily, weekly, expression).'
            ),
          createdAt: z.string().nullish().describe('When the sync was created.'),
          updatedAt: z.string().nullish().describe('When the sync was last updated.')
        })
      ),
      totalRecords: z.number().optional().describe('Total number of syncs available.'),
      currentPage: z.number().optional().describe('Current page number.'),
      returnedCount: z.number().describe('Rows in this response.'),
      nextPage: z.number().nullable().optional(),
      lastPage: z.number().optional().describe('Last page number.')
    })
  )
  .handleInvocation(async ctx => {
    let client = await workspaceClient(ctx);

    let result = await client.listSyncs({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      order: ctx.input.order,
      allPages: ctx.input.allPages
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
        lastPage: result.pagination?.lastPage,
        nextPage: result.pagination?.nextPage,
        returnedCount: syncs.length
      },
      message: `Found **${syncs.length}** sync(s).`
    };
  })
  .build();
