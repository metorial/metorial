import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let crawledPageSchema = z.object({
  url: z.string().describe('URL of the crawled page'),
  content: z.string().optional().describe('Page content in markdown format'),
  pageName: z.string().optional().describe('Name/title of the page'),
  pageDescription: z.string().optional().describe('Description of the page')
});

export let getCrawlJobResult = SlateTool.create(spec, {
  name: 'Get Crawl Job Result',
  key: 'get_crawl_job_result',
  description: `Retrieve the status and results of a website crawl job. Use this to poll for results after starting a crawl with the "Crawl Website" tool.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('Job ID returned from the crawl request')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Job status (e.g. "processing", "completed", "failed")'),
      pages: z
        .array(crawledPageSchema)
        .optional()
        .describe('Array of crawled pages with their content'),
      totalPages: z.number().optional().describe('Total number of pages crawled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCrawlStatus(ctx.input.jobId);

    let pages = result.pages ?? result.data ?? [];

    return {
      output: {
        status: result.status,
        pages: pages,
        totalPages: pages.length ?? result.totalPages
      },
      message:
        result.status === 'completed'
          ? `Crawl completed — **${pages.length}** pages extracted.`
          : `Crawl status: **${result.status}**. ${result.status === 'processing' ? 'Try again shortly.' : ''}`
    };
  })
  .build();
