import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelRun = SlateTool.create(spec, {
  name: 'Cancel Run',
  key: 'cancel_run',
  description: `Cancel a running scraping job. The run status will change to "cancelled" and any data extracted so far will remain available for download.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      runToken: z.string().describe('Unique token identifying the run to cancel')
    })
  )
  .output(
    z.object({
      projectToken: z.string().describe('Token of the project this run belongs to'),
      runToken: z.string().describe('Unique token identifying the cancelled run'),
      status: z.string().describe('Updated status of the run (should be "cancelled")'),
      dataReady: z.number().describe('Whether extracted data is available'),
      startTime: z.string().describe('When the run started'),
      endTime: z.string().describe('When the run was cancelled'),
      pages: z.number().describe('Number of pages scraped before cancellation'),
      startUrl: z.string().describe('URL the run started scraping from')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let run = await client.cancelRun(ctx.input.runToken);

    return {
      output: {
        projectToken: run.project_token,
        runToken: run.run_token,
        status: run.status,
        dataReady: run.data_ready,
        startTime: run.start_time,
        endTime: run.end_time,
        pages: run.pages,
        startUrl: run.start_url
      },
      message: `Run **${run.run_token}** has been cancelled. ${run.pages} page(s) were scraped. Data ${run.data_ready ? 'is' : 'is not'} available.`
    };
  })
  .build();
