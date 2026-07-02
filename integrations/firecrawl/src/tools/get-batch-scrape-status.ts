import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { idStatusOutputShape, pageDataSchema, pagesFrom } from './shared';

export let getBatchScrapeStatusTool = SlateTool.create(spec, {
  name: 'Get Batch Scrape Status',
  key: 'get_batch_scrape_status',
  description: `Check a Firecrawl batch scrape job and retrieve available page data. Use this with the batchId returned by Batch Scrape. Use Get Batch Scrape Errors for failed URLs and Cancel Batch Scrape to stop a running job.`,
  instructions: [
    'Provide the batchId returned by Batch Scrape.',
    'If status is scraping, poll again later.',
    'If nextUrl is present, Firecrawl has additional paginated data.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      batchId: z.string().describe('The ID of the batch scrape job to check')
    })
  )
  .output(
    z.object({
      ...idStatusOutputShape,
      total: z.number().optional().describe('Total URLs attempted'),
      completed: z.number().optional().describe('URLs successfully scraped'),
      nextUrl: z.string().optional().describe('URL for retrieving additional result data'),
      pages: z.array(pageDataSchema).optional().describe('Scraped page data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getBatchScrapeStatus(ctx.input.batchId);
    let pages = pagesFrom(result.data);

    return {
      output: {
        status: result.status,
        success: result.success,
        total: result.total,
        completed: result.completed,
        creditsUsed: result.creditsUsed,
        expiresAt: result.expiresAt,
        nextUrl: result.next,
        pages
      },
      message: `Batch scrape \`${ctx.input.batchId}\` is **${result.status}**. Progress: ${result.completed ?? 0}/${result.total ?? '?'}.`
    };
  });
