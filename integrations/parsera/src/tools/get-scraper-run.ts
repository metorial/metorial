import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, scraperRunSchema } from '../lib/client';
import { spec } from '../spec';

export let getScraperRunTool = SlateTool.create(spec, {
  name: 'Get Scraper Run',
  key: 'get_scraper_run',
  description:
    'Retrieve an asynchronous scraper run’s current state, progress, credit usage, and extracted data when available. Results preserve their per-URL structure.',
  instructions: [
    'Use the run_id returned by run_scraper_async, or the runId reported when a synchronous run is still processing.',
    'Poll again while the status is queued or running. Completed_partial indicates that some URLs failed.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      runId: z
        .string()
        .describe('run_id from run_scraper_async or a synchronous run still in progress')
    })
  )
  .output(
    z.object({
      run: scraperRunSchema.describe(
        'Provider run response with run_id, status, optional progress, credits_charged, data, and additional failure details'
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let run = await client.getScraperRun(ctx.input.runId);
    return {
      output: { run },
      message: `Scraper run **${run.run_id}** is **${run.status}**`
    };
  })
  .build();
