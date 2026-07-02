import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { BrightDataClient } from '../lib/client';
import { spec } from '../spec';

export let scrapingJobCompleted = SlateTrigger.create(spec, {
  name: 'Scraping Job Completed',
  key: 'scraping_job_completed',
  description:
    'Triggers when a scraping job (snapshot) reaches a terminal state — either "ready" (success) or "failed". Polls the snapshot history API for the configured dataset.'
})
  .input(
    z.object({
      snapshotId: z.string().describe('Snapshot ID of the completed job.'),
      datasetId: z.string().describe('Dataset/scraper ID associated with this job.'),
      status: z.string().describe('Terminal status of the job: "ready" or "failed".')
    })
  )
  .output(
    z.object({
      snapshotId: z.string().describe('Snapshot ID of the completed job.'),
      datasetId: z.string().describe('Dataset/scraper ID associated with this job.'),
      status: z.string().describe('Terminal status: "ready" or "failed".')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new BrightDataClient({ token: ctx.auth.token });

      let state = (ctx.state ?? {}) as { seenSnapshotIds?: string[] };
      let seenSnapshotIds = state.seenSnapshotIds ?? [];

      let datasetId = ctx.config.datasetId;
      if (!datasetId) {
        return {
          inputs: [],
          updatedState: { seenSnapshotIds }
        };
      }

      let snapshots = await client.getSnapshotHistory(datasetId);

      let terminalSnapshots: Array<{ snapshotId: string; datasetId: string; status: string }> =
        [];

      for (let snap of snapshots) {
        let id = ((snap as Record<string, unknown>).snapshot_id ??
          (snap as Record<string, unknown>).id ??
          '') as string;
        let status = ((snap as Record<string, unknown>).status ?? '') as string;

        if (!id) continue;
        if (seenSnapshotIds.includes(id)) continue;

        if (status === 'ready' || status === 'failed') {
          terminalSnapshots.push({
            snapshotId: id,
            datasetId,
            status
          });
        }
      }

      let newSeenIds = [...seenSnapshotIds, ...terminalSnapshots.map(s => s.snapshotId)];

      if (newSeenIds.length > 500) {
        newSeenIds = newSeenIds.slice(newSeenIds.length - 500);
      }

      return {
        inputs: terminalSnapshots,
        updatedState: {
          seenSnapshotIds: newSeenIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `scraping_job.${ctx.input.status}`,
        id: ctx.input.snapshotId,
        output: {
          snapshotId: ctx.input.snapshotId,
          datasetId: ctx.input.datasetId,
          status: ctx.input.status
        }
      };
    }
  })
  .build();
