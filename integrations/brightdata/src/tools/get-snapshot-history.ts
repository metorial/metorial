import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrightDataClient } from '../lib/client';
import { spec } from '../spec';

export let getSnapshotHistory = SlateTool.create(spec, {
  name: 'Get Snapshot History',
  key: 'get_snapshot_history',
  description: `Retrieve the history of all snapshots (scraping jobs) for a specific dataset/scraper. Returns a list of snapshots including their IDs, statuses, and creation dates.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      datasetId: z
        .string()
        .describe('ID of the dataset/scraper to retrieve snapshot history for.')
    })
  )
  .output(
    z.object({
      snapshots: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of snapshots with their metadata (ID, status, timestamps).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrightDataClient({ token: ctx.auth.token });

    let snapshots = await client.getSnapshotHistory(ctx.input.datasetId);

    return {
      output: { snapshots },
      message: `Found **${snapshots.length}** snapshot(s) for dataset **${ctx.input.datasetId}**.`
    };
  })
  .build();
