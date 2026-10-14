import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let stopScrapingJob = SlateTool.create(spec, {
  name: 'Stop Scraping Job',
  key: 'stop_scraping_job',
  description:
    'Request that a running scraping job stop. Use get_scraping_job to monitor when it reaches stopped status.',
  tags: { destructive: false, readOnly: false }
})
  .input(z.object({ scrapingJobId: z.number().describe('ID of the scraping job to stop') }))
  .output(
    z.object({
      scrapingJobId: z.number(),
      success: z.boolean().describe('Whether the provider accepted the stop request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.stopScrapingJob(ctx.input.scrapingJobId);
    return {
      output: { scrapingJobId: ctx.input.scrapingJobId, success: true },
      message: `Requested that scraping job \`${ctx.input.scrapingJobId}\` stop.`
    };
  })
  .build();
