import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let continueScrapingJob = SlateTool.create(spec, {
  name: 'Continue Scraping Job',
  key: 'continue_scraping_job',
  description:
    'Continue a stopped or pausable scraping job. Omitted execution settings retain the job’s current values. Use get_scraping_job to monitor progress.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      scrapingJobId: z.number().describe('ID of the scraping job to continue'),
      driver: z
        .enum(['fast', 'fulljs'])
        .optional()
        .describe('fast skips JavaScript; fulljs executes JavaScript'),
      proxy: z
        .string()
        .optional()
        .describe('Override the current proxy, for example datacenter-us'),
      requestInterval: z
        .number()
        .optional()
        .describe('Non-negative whole milliseconds between requests'),
      pageLoadDelay: z
        .number()
        .optional()
        .describe('Non-negative whole milliseconds after page load'),
      priority: z.number().optional().describe('Job priority from 1 to 5')
    })
  )
  .output(
    z.object({
      scrapingJobId: z.number(),
      success: z.boolean().describe('Whether the provider accepted the continuation request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.continueScrapingJob(ctx.input.scrapingJobId, ctx.input);
    return {
      output: { scrapingJobId: ctx.input.scrapingJobId, success: true },
      message: `Requested continuation of scraping job \`${ctx.input.scrapingJobId}\`.`
    };
  })
  .build();
