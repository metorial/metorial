import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { idStatusOutputShape, pageDataSchema, pagesFrom } from './shared';

export let getCrawlStatusTool = SlateTool.create(spec, {
  name: 'Get Crawl Status',
  key: 'get_crawl_status',
  description: `Check a Firecrawl crawl job and retrieve available page data. Use this with the crawlId returned by Crawl Website. Use Get Crawl Errors for failed pages and Cancel Crawl to stop a running job.`,
  instructions: [
    'Provide the crawlId returned by Crawl Website.',
    'If status is scraping, poll again later.',
    'If nextUrl is present, Firecrawl has additional paginated data.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      crawlId: z.string().describe('The ID of the crawl job to check')
    })
  )
  .output(
    z.object({
      ...idStatusOutputShape,
      total: z.number().optional().describe('Total pages attempted'),
      completed: z.number().optional().describe('Pages successfully scraped'),
      nextUrl: z.string().optional().describe('URL for retrieving additional result data'),
      pages: z.array(pageDataSchema).optional().describe('Scraped page data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getCrawlStatus(ctx.input.crawlId);
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
      message: `Crawl job \`${ctx.input.crawlId}\` is **${result.status}**. Progress: ${result.completed ?? 0}/${result.total ?? '?'}.`
    };
  });
