import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrightDataClient } from '../lib/client';
import { spec } from '../spec';

export let getSnapshotHistory = SlateTool.create(spec, {
  name: 'Get Snapshot History',
  key: 'get_snapshot_history',
  description: `Retrieve a page of snapshots (scraping jobs) for a specific dataset/scraper. Filter by status or creation date and page through the history with skip and limit.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      datasetId: z
        .string()
        .describe(
          'ID of the dataset/scraper to retrieve snapshot history for. Use list_scrapers to discover IDs.'
        ),
      status: z
        .enum(['starting', 'running', 'ready', 'failed', 'canceled'])
        .optional()
        .describe('Return only snapshots with this status.'),
      skip: z
        .number()
        .min(0)
        .refine(Number.isSafeInteger)
        .optional()
        .describe('Number of snapshots to skip.'),
      limit: z
        .number()
        .min(1)
        .max(5000)
        .refine(Number.isSafeInteger)
        .optional()
        .describe('Maximum snapshots to return; the provider defaults to 1000.'),
      fromDate: z
        .string()
        .optional()
        .describe('Return snapshots created after this date (YYYY-MM-DD).'),
      toDate: z
        .string()
        .optional()
        .describe('Return snapshots created before this date (YYYY-MM-DD).')
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

    let snapshots = await client.getSnapshotHistory(ctx.input.datasetId, ctx.input);

    return {
      output: { snapshots },
      message: `Found **${snapshots.length}** snapshot(s) for dataset **${ctx.input.datasetId}**.`
    };
  })
  .build();
