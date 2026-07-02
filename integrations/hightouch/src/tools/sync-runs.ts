import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let rowCountsSchema = z.object({
  addedCount: z.number().describe('Number of rows added'),
  changedCount: z.number().describe('Number of rows changed'),
  removedCount: z.number().describe('Number of rows removed')
});

let syncRunSchema = z.object({
  runId: z.number().describe('Unique ID of the sync run'),
  status: z
    .string()
    .describe(
      'Status of the run (e.g. success, failed, aborted, interrupted, warning, queued, processing)'
    ),
  completionRatio: z.number().describe('Completion ratio from 0 to 1'),
  querySize: z.number().describe('Number of rows in the query result'),
  plannedRows: rowCountsSchema.describe('Rows planned for syncing'),
  successfulRows: rowCountsSchema.describe('Rows successfully synced'),
  failedRows: rowCountsSchema.describe('Rows that failed to sync'),
  error: z.string().nullable().optional().describe('Error message if the run failed'),
  createdAt: z.string().describe('ISO timestamp when the run was created'),
  startedAt: z.string().describe('ISO timestamp when the run started'),
  finishedAt: z.string().describe('ISO timestamp when the run finished')
});

export let listSyncRuns = SlateTool.create(spec, {
  name: 'List Sync Runs',
  key: 'list_sync_runs',
  description: `List run history for a specific sync, including status, row counts (added/changed/removed), error details, and timing. Useful for monitoring and debugging sync execution. Supports filtering by time range and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      syncId: z.number().describe('ID of the sync to list runs for'),
      limit: z.number().optional().describe('Max number of runs to return (default 100)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)'),
      orderBy: z
        .enum(['id', 'createdAt', 'startedAt', 'finishedAt'])
        .optional()
        .describe('Field to sort results by'),
      runId: z.number().optional().describe('Filter to a specific run ID'),
      after: z.string().optional().describe('Filter runs started after this ISO timestamp'),
      before: z.string().optional().describe('Filter runs started before this ISO timestamp'),
      within: z.number().optional().describe('Filter runs started within the last N minutes')
    })
  )
  .output(
    z.object({
      runs: z.array(syncRunSchema).describe('List of sync runs'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { syncId, ...params } = ctx.input;
    let result = await client.listSyncRuns(syncId, params);

    return {
      output: {
        runs: result.data,
        hasMore: result.hasMore
      },
      message: `Found **${result.data.length}** sync run(s) for sync ${syncId}.${result.hasMore ? ' More results available.' : ''}`
    };
  })
  .build();

export let getSyncSequenceRun = SlateTool.create(spec, {
  name: 'Get Sync Sequence Run',
  key: 'get_sync_sequence_run',
  description: `Check the status of a sync sequence run. Returns the overall status and details of each sync within the sequence.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sequenceRunId: z.string().describe('ID of the sync sequence run to check')
    })
  )
  .output(
    z.object({
      sequenceRunId: z.string().describe('ID of the sequence run'),
      status: z.string().describe('Overall status of the sequence run'),
      syncRuns: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Details of individual sync runs within the sequence')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getSyncSequenceRun(ctx.input.sequenceRunId);

    return {
      output: {
        sequenceRunId: result.id ?? ctx.input.sequenceRunId,
        status: result.status,
        syncRuns: result.syncRuns
      },
      message: `Sync sequence run **${ctx.input.sequenceRunId}** status: **${result.status}**.`
    };
  })
  .build();
