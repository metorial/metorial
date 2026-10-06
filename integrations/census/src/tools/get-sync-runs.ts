import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { workspaceClient } from '../lib/client';
import { allPages, workspaceId } from '../lib/schemas';
import { spec } from '../spec';

let syncRunSchema = z.object({
  syncRunId: z.number().describe('ID of the sync run.'),
  syncId: z.number().describe('ID of the parent sync.'),
  status: z.string().describe('Run status: queued, working, completed, failed, or skipped.'),
  fullSync: z.boolean().optional().describe('Whether this was a full sync.'),
  canceled: z.boolean().optional().describe('Whether the run was canceled.'),
  currentStep: z.string().nullish().describe('Current processing step.'),
  sourceRecordCount: z.number().nullish().describe('Total records from source.'),
  recordsProcessed: z.number().nullish().describe('Records processed.'),
  recordsUpdated: z.number().nullish().describe('Records updated in destination.'),
  recordsFailed: z.number().nullish().describe('Records that failed to sync.'),
  recordsInvalid: z.number().nullish().describe('Records that were invalid.'),
  errorCode: z.string().nullish().describe('Error code if failed.'),
  errorMessage: z
    .string()
    .nullish()
    .describe(
      'Diagnostic messages are omitted because they can contain credentials or record values.'
    ),
  createdAt: z.string().nullish().describe('When the run started.'),
  completedAt: z.string().nullish().describe('When the run completed.')
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
      workspaceId,
      allPages,
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
      returnedCount: z.number().describe('Rows in this response.'),
      nextPage: z.number().nullable().optional(),
      lastPage: z.number().optional().describe('Last page number.')
    })
  )
  .handleInvocation(async ctx => {
    let client = await workspaceClient(ctx);

    if (ctx.input.syncRunId !== undefined) {
      let run = await client.getSyncRun(ctx.input.syncRunId);
      if (ctx.input.syncId !== undefined && run.syncId !== ctx.input.syncId)
        throw createApiServiceError('The run belongs to a different sync.');
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
        errorMessage: undefined,
        createdAt: run.createdAt,
        completedAt: run.completedAt
      };
      return {
        output: { syncRuns: [mapped], returnedCount: 1 },
        message: `Sync run **${run.id}** is **${run.status}**${run.recordsProcessed != null ? ` (${run.recordsProcessed} processed, ${run.recordsFailed ?? 'unknown'} failed)` : ''}.`
      };
    }

    if (ctx.input.syncId === undefined) {
      throw createApiServiceError('Either syncId or syncRunId must be provided.');
    }

    let result = await client.listSyncRuns(ctx.input.syncId, {
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      order: ctx.input.order,
      allPages: ctx.input.allPages
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
      errorMessage: undefined,
      createdAt: r.createdAt,
      completedAt: r.completedAt
    }));

    return {
      output: {
        syncRuns: runs,
        totalRecords: result.pagination?.totalRecords,
        currentPage: result.pagination?.page,
        lastPage: result.pagination?.lastPage,
        nextPage: result.pagination?.nextPage,
        returnedCount: runs.length
      },
      message: `Found **${runs.length}** sync run(s) for sync ${ctx.input.syncId}.`
    };
  })
  .build();
