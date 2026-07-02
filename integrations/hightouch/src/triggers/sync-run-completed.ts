import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let rowCountsSchema = z.object({
  addedCount: z.number().describe('Number of rows added'),
  changedCount: z.number().describe('Number of rows changed'),
  removedCount: z.number().describe('Number of rows removed')
});

export let syncRunCompleted = SlateTrigger.create(spec, {
  name: 'Sync Run Completed',
  key: 'sync_run_completed',
  description:
    'Triggers when a sync run finishes (successfully, with failure, or aborted). Polls the sync run history for new completed runs.'
})
  .input(
    z.object({
      syncId: z.number().describe('ID of the sync'),
      runId: z.number().describe('ID of the sync run'),
      status: z.string().describe('Status of the sync run'),
      completionRatio: z.number().describe('Completion ratio'),
      querySize: z.number().describe('Number of rows in the query'),
      plannedRows: rowCountsSchema.describe('Planned row counts'),
      successfulRows: rowCountsSchema.describe('Successful row counts'),
      failedRows: rowCountsSchema.describe('Failed row counts'),
      error: z.string().nullable().optional().describe('Error message if the run failed'),
      createdAt: z.string().describe('ISO timestamp when the run was created'),
      startedAt: z.string().describe('ISO timestamp when the run started'),
      finishedAt: z.string().describe('ISO timestamp when the run finished')
    })
  )
  .output(
    z.object({
      syncId: z.number().describe('ID of the sync that ran'),
      runId: z.number().describe('ID of the sync run'),
      status: z.string().describe('Final status of the run (e.g. success, failed, aborted)'),
      completionRatio: z.number().describe('Completion ratio (0 to 1)'),
      querySize: z.number().describe('Number of rows returned by the query'),
      plannedRows: rowCountsSchema.describe('Rows planned for syncing'),
      successfulRows: rowCountsSchema.describe('Rows successfully synced'),
      failedRows: rowCountsSchema.describe('Rows that failed to sync'),
      error: z.string().nullable().optional().describe('Error message if the run failed'),
      createdAt: z.string().describe('ISO timestamp when the run was created'),
      startedAt: z.string().describe('ISO timestamp when the run started'),
      finishedAt: z.string().describe('ISO timestamp when the run finished')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;
      let syncIds = ctx.state?.syncIds as number[] | undefined;

      // On first run, fetch all syncs to get their IDs
      if (!syncIds) {
        let allSyncIds: number[] = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          let result = await client.listSyncs({ limit: 100, offset });
          allSyncIds.push(...result.data.map((s: any) => s.id));
          hasMore = result.hasMore;
          offset += 100;
        }

        syncIds = allSyncIds;
      }

      let now = new Date().toISOString();
      let inputs: any[] = [];

      for (let syncId of syncIds) {
        try {
          let params: any = {
            limit: 50,
            orderBy: 'id'
          };

          if (lastPolledAt) {
            params.after = lastPolledAt;
          } else {
            // On first poll, only look at recent runs (last 60 minutes)
            params.within = 60;
          }

          let result = await client.listSyncRuns(syncId, params);

          for (let run of result.data) {
            // Only emit completed runs (not queued or processing)
            let finalStatuses = ['success', 'failed', 'aborted', 'interrupted', 'warning'];
            if (finalStatuses.includes(run.status)) {
              inputs.push({
                syncId,
                runId: run.id,
                status: run.status,
                completionRatio: run.completionRatio,
                querySize: run.querySize,
                plannedRows: run.plannedRows,
                successfulRows: run.successfulRows,
                failedRows: run.failedRows,
                error: run.error ?? null,
                createdAt: run.createdAt,
                startedAt: run.startedAt,
                finishedAt: run.finishedAt
              });
            }
          }
        } catch (err) {
          // Skip syncs that may have been deleted
          ctx.warn(`Failed to fetch runs for sync ${syncId}: ${String(err)}`);
        }
      }

      return {
        inputs,
        updatedState: {
          lastPolledAt: now,
          syncIds
        }
      };
    },

    handleEvent: async ctx => {
      let statusMap: Record<string, string> = {
        success: 'sync_run.succeeded',
        failed: 'sync_run.failed',
        aborted: 'sync_run.aborted',
        interrupted: 'sync_run.interrupted',
        warning: 'sync_run.warning'
      };

      let type = statusMap[ctx.input.status] ?? `sync_run.${ctx.input.status}`;

      return {
        type,
        id: `${ctx.input.syncId}-${ctx.input.runId}`,
        output: {
          syncId: ctx.input.syncId,
          runId: ctx.input.runId,
          status: ctx.input.status,
          completionRatio: ctx.input.completionRatio,
          querySize: ctx.input.querySize,
          plannedRows: ctx.input.plannedRows,
          successfulRows: ctx.input.successfulRows,
          failedRows: ctx.input.failedRows,
          error: ctx.input.error,
          createdAt: ctx.input.createdAt,
          startedAt: ctx.input.startedAt,
          finishedAt: ctx.input.finishedAt
        }
      };
    }
  })
  .build();
