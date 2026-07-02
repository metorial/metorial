import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let batchErrorSchema = z.object({
  id: z.string().optional().describe('Failed scrape job ID'),
  timestamp: z.string().optional().describe('Failure timestamp'),
  url: z.string().optional().describe('URL that failed'),
  error: z.string().optional().describe('Error message')
});

export let cancelBatchScrapeTool = SlateTool.create(spec, {
  name: 'Cancel Batch Scrape',
  key: 'cancel_batch_scrape',
  description: `Cancel a running Firecrawl batch scrape job.`,
  instructions: ['Provide the batchId returned by Batch Scrape.'],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      batchId: z.string().describe('The ID of the batch scrape job to cancel')
    })
  )
  .output(
    z.object({
      status: z.string().optional().describe('Cancellation status'),
      success: z.boolean().optional().describe('Whether Firecrawl accepted the cancellation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.cancelBatchScrape(ctx.input.batchId);

    return {
      output: {
        status: result.status,
        success: result.success
      },
      message: `Cancelled batch scrape job \`${ctx.input.batchId}\`.`
    };
  });

export let getBatchScrapeErrorsTool = SlateTool.create(spec, {
  name: 'Get Batch Scrape Errors',
  key: 'get_batch_scrape_errors',
  description: `Retrieve failed URLs for a Firecrawl batch scrape job.`,
  instructions: ['Provide the batchId returned by Batch Scrape.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      batchId: z.string().describe('The ID of the batch scrape job')
    })
  )
  .output(
    z.object({
      errors: z.array(batchErrorSchema).describe('Failed scrape jobs and details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getBatchScrapeErrors(ctx.input.batchId);
    let errors = Array.isArray(result.errors) ? result.errors : [];

    return {
      output: {
        errors
      },
      message: `Retrieved **${errors.length}** batch scrape error(s) for \`${ctx.input.batchId}\`.`
    };
  });
