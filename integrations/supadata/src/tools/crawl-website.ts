import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let crawlWebsite = SlateTool.create(spec, {
  name: 'Crawl Website',
  key: 'crawl_website',
  description: `Start an asynchronous crawl of a website to extract content from all its pages. Returns a job ID to poll for results.
The crawler follows only child links — for example, crawling \`https://example.com/blog\` will follow \`/blog/article-1\` but not \`/about\`.`,
  instructions: [
    'Use the "Get Crawl Job Result" tool to poll for the crawl status and retrieve page content.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('Starting URL for the crawl'),
      pageLimit: z.number().optional().describe('Maximum number of pages to crawl')
    })
  )
  .output(
    z.object({
      jobId: z
        .string()
        .describe('Job ID for the async crawl — poll with "Get Crawl Job Result"')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createCrawl({
      url: ctx.input.url,
      limit: ctx.input.pageLimit
    });

    return {
      output: {
        jobId: result.jobId
      },
      message: `Crawl job started for ${ctx.input.url}. Job ID: **${result.jobId}**. Use "Get Crawl Job Result" to check status.`
    };
  })
  .build();
