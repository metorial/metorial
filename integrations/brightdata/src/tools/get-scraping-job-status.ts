import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrightDataClient } from '../lib/client';
import { spec } from '../spec';

export let getScrapingJobStatus = SlateTool.create(spec, {
  name: 'Get Scraping Job Status',
  key: 'get_scraping_job_status',
  description: `Check the progress and status of an asynchronous scraping job. Returns the current status (starting, running, ready, failed) along with the associated dataset ID. Use after triggering a scraping job to know when results are available for download.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      snapshotId: z
        .string()
        .describe('The snapshot ID returned when the scraping job was triggered.')
    })
  )
  .output(
    z.object({
      snapshotId: z.string().describe('The snapshot ID of the job.'),
      datasetId: z.string().describe('The dataset/scraper ID used for this job.'),
      status: z
        .string()
        .describe('Current status: "starting", "running", "ready", or "failed".')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrightDataClient({ token: ctx.auth.token });

    let result = await client.getSnapshotProgress(ctx.input.snapshotId);

    let statusEmoji =
      result.status === 'ready' ? '✅' : result.status === 'failed' ? '❌' : '⏳';

    return {
      output: result,
      message: `${statusEmoji} Job **${result.snapshotId}** status: **${result.status}**${result.status === 'ready' ? '. Results are ready for download.' : '.'}`
    };
  })
  .build();
