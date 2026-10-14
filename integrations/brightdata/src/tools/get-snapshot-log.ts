import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrightDataClient } from '../lib/client';
import { spec } from '../spec';

export let getSnapshotLog = SlateTool.create(spec, {
  name: 'Get Snapshot Log',
  key: 'get_snapshot_log',
  description:
    'Inspect a scraping job snapshot with its status, scraper and dataset names, input and record counts, duration, and collection diagnostics. Use download_snapshot to retrieve the collected records.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      snapshotId: z
        .string()
        .describe('Snapshot ID returned by trigger_scraping_job or scrape_synchronous.')
    })
  )
  .output(
    z.object({
      log: z
        .record(z.string(), z.unknown())
        .describe('Snapshot metadata and diagnostics returned by Bright Data.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrightDataClient({ token: ctx.auth.token });
    let log = await client.getSnapshotLog(ctx.input.snapshotId);
    return {
      output: { log },
      message: `Retrieved log for snapshot **${ctx.input.snapshotId}**.`
    };
  })
  .build();
