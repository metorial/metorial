import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrightDataClient } from '../lib/client';
import { spec } from '../spec';

export let cancelScrapingJob = SlateTool.create(spec, {
  name: 'Cancel Scraping Job',
  key: 'cancel_scraping_job',
  description: `Cancel a running scraping job before it finishes. Stops the data collection process for the given snapshot. Returns the cancellation status.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      snapshotId: z.string().describe('The snapshot ID of the scraping job to cancel.')
    })
  )
  .output(
    z.object({
      result: z.string().describe('Cancellation result message (e.g., "ok").')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrightDataClient({ token: ctx.auth.token });

    let result = await client.cancelCollection(ctx.input.snapshotId);

    return {
      output: { result },
      message: `Cancellation request sent for snapshot **${ctx.input.snapshotId}**. Result: ${result}`
    };
  })
  .build();
