import { createApiServiceError, SlateTool } from 'slates';
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
      jobId: z.string().describe('Job ID returned from the crawl request'),
      skip: z
        .number()
        .optional()
        .describe(
          'Number of pages to skip. Use the skip value in a previous result next URL to retrieve more pages.'
        )
    })
  )
  .output(
    z.object({
      status: z
        .string()
        .describe('Job status (e.g. "scraping", "completed", "failed", "cancelled")'),
      pages: z
        .array(crawledPageSchema)
        .optional()
        .describe('Array of crawled pages with their content'),
      totalPages: z
        .number()
        .optional()
        .describe(
          'Total number of pages crawled when reported, otherwise the number in this response'
        ),
      next: z
        .string()
        .optional()
        .describe(
          'URL for the next result page; its skip parameter can be used in another call'
        )
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.skip !== undefined &&
      (!Number.isInteger(ctx.input.skip) || ctx.input.skip < 0)
    ) {
      throw createApiServiceError('Crawl skip must be a non-negative whole number.');
    }

    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCrawlStatus(ctx.input.jobId, ctx.input.skip);

    let pages = (result.pages ?? result.data ?? []).map(
      (page: {
        url: string;
        content?: string;
        name?: string;
        description?: string;
        pageName?: string;
        pageDescription?: string;
      }) => ({
        url: page.url,
        content: page.content,
        pageName: page.pageName ?? page.name,
        pageDescription: page.pageDescription ?? page.description
      })
    );

    return {
      output: {
        status: result.status,
        pages,
        totalPages: result.totalPages ?? pages.length,
        next: result.next ?? undefined
      },
      message:
        result.status === 'completed'
          ? `Crawl completed — **${pages.length}** pages extracted.`
          : `Crawl status: **${result.status}**. ${['scraping', 'processing'].includes(result.status) ? 'Try again shortly.' : ''}`
    };
  })
  .build();
