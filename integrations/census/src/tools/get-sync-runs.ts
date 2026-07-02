import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let syncRunSchema = z.object({
  syncRunId: z.number().describe('ID of the sync run.'),
  syncId: z.number().describe('ID of the parent sync.'),
  status: z.string().describe('Run status: queued, working, completed, failed, or skipped.'),
  fullSync: z.boolean().describe('Whether this was a full sync.'),
  canceled: z.boolean().describe('Whether the run was canceled.'),
  currentStep: z.string().nullable().describe('Current processing step.'),
  sourceRecordCount: z.number().nullable().describe('Total records from source.'),
  recordsProcessed: z.number().nullable().describe('Records processed.'),
  recordsUpdated: z.number().nullable().describe('Records updated in destination.'),
  recordsFailed: z.number().nullable().describe('Records that failed to sync.'),
  recordsInvalid: z.number().nullable().describe('Records that were invalid.'),
  errorCode: z.string().nullable().describe('Error code if failed.'),
  errorMessage: z.string().nullable().describe('Error message if failed.'),
  createdAt: z.string().describe('When the run started.'),
  completedAt: z.string().nullable().describe('When the run completed.')
});

export let getSyncRuns = SlateTool.create(spec, {
  name: 'Get Sync Runs',
  key: 'get_sync_runs',
  description: `Retrieves sync run history and status for a specific sync. Use this to monitor sync progress, check for failures, and view record-level statistics. Can also fetch a single sync run by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      syncId: z
        .number()
        .optional()
        .describe('ID of the sync to list runs for. Required if syncRunId is not provided.'),
      syncRunId: z
        .number()
        .optional()
        .describe('ID of a specific sync run to retrieve directly.'),
      page: z.number().optional().describe('Page number (starts at 1).'),
      perPage: z.number().optional().describe('Results per page (max 100).'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order by creation time.')
    })
  )
  .output(
    z.object({
      syncRuns: z.array(syncRunSchema),
      totalRecords: z.number().optional().describe('Total number of sync runs.'),
      currentPage: z.number().optional().describe('Current page number.'),
      lastPage: z.number().optional().describe('Last page number.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    if (ctx.input.syncRunId) {
      let run = await client.getSyncRun(ctx.input.syncRunId);
      let mapped = {
        syncRunId: run.id,
        syncId: run.syncId,
        status: run.status,
        fullSync: run.fullSync,
        canceled: run.canceled,
        currentStep: run.currentStep,
        sourceRecordCount: run.sourceRecordCount,
        recordsProcessed: run.recordsProcessed,
        recordsUpdated: run.recordsUpdated,
        recordsFailed: run.recordsFailed,
        recordsInvalid: run.recordsInvalid,
        errorCode: run.errorCode,
        errorMessage: run.errorMessage,
        createdAt: run.createdAt,
        completedAt: run.completedAt
      };
      return {
        output: { syncRuns: [mapped] },
        message: `Sync run **${run.id}** is **${run.status}**${run.recordsProcessed != null ? ` (${run.recordsProcessed} processed, ${run.recordsFailed ?? 0} failed)` : ''}.`
      };
    }

    if (!ctx.input.syncId) {
      throw new Error('Either syncId or syncRunId must be provided.');
    }

    let result = await client.listSyncRuns(ctx.input.syncId, {
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      order: ctx.input.order
    });

    let runs = result.syncRuns.map(r => ({
      syncRunId: r.id,
      syncId: r.syncId,
      status: r.status,
      fullSync: r.fullSync,
      canceled: r.canceled,
      currentStep: r.currentStep,
      sourceRecordCount: r.sourceRecordCount,
      recordsProcessed: r.recordsProcessed,
      recordsUpdated: r.recordsUpdated,
      recordsFailed: r.recordsFailed,
      recordsInvalid: r.recordsInvalid,
      errorCode: r.errorCode,
      errorMessage: r.errorMessage,
      createdAt: r.createdAt,
      completedAt: r.completedAt
    }));

    return {
      output: {
        syncRuns: runs,
        totalRecords: result.pagination?.totalRecords,
        currentPage: result.pagination?.page,
        lastPage: result.pagination?.lastPage
      },
      message: `Found **${runs.length}** sync run(s) for sync ${ctx.input.syncId}${result.pagination ? ` (page ${result.pagination.page} of ${result.pagination.lastPage})` : ''}.`
    };
  })
  .build();
