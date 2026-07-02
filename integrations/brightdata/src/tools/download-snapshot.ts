import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrightDataClient } from '../lib/client';
import { spec } from '../spec';

export let downloadSnapshot = SlateTool.create(spec, {
  name: 'Download Snapshot',
  key: 'download_snapshot',
  description: `Download the results of a completed scraping job by its snapshot ID. Returns the scraped data as structured records. Data remains available for 16 days after collection.`,
  instructions: [
    'Ensure the scraping job status is "ready" before attempting to download.',
    'Use "Get Scraping Job Status" first to verify the job has completed.'
  ],
  constraints: [
    'Snapshot data is available for 16 days after collection.',
    'A 409 error is returned if the snapshot is not yet ready.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      snapshotId: z.string().describe('The snapshot ID of the completed scraping job.'),
      format: z
        .enum(['json', 'ndjson', 'csv'])
        .optional()
        .describe('Desired output format for the data.'),
      compress: z.boolean().optional().describe('Whether to compress the response data.')
    })
  )
  .output(
    z.object({
      records: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of scraped data records.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrightDataClient({ token: ctx.auth.token });

    let result = await client.downloadSnapshot({
      snapshotId: ctx.input.snapshotId,
      format: ctx.input.format,
      compress: ctx.input.compress
    });

    return {
      output: result,
      message: `Downloaded **${result.records.length}** record(s) from snapshot **${ctx.input.snapshotId}**.`
    };
  })
  .build();
