import { SlateTool } from 'slates';
import { z } from 'zod';
import { HyperbrowserClient } from '../lib/client';
import { scrapeOptionsSchema, sessionOptionsSchema } from '../lib/schemas';
import { spec } from '../spec';

export let batchScrape = SlateTool.create(spec, {
  name: 'Batch Scrape',
  key: 'batch_scrape',
  description: `Scrape content from multiple webpages simultaneously in a single batch job.
Returns results for each URL in the same order as provided. Each page's content is available in markdown, HTML, links, or screenshot format.`,
  instructions: [
    'Provide up to 1,000 URLs per batch request.',
    'Each URL must include the full protocol (https://).'
  ],
  constraints: ['Maximum of 1,000 URLs per batch.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      urls: z.array(z.string()).describe('List of URLs to scrape (up to 1,000)'),
      scrapeOptions: scrapeOptionsSchema,
      sessionOptions: sessionOptionsSchema
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Batch scrape job identifier'),
      status: z.string().describe('Job status'),
      totalScrapedPages: z.number().optional().describe('Total number of pages scraped'),
      pages: z
        .array(
          z.object({
            url: z.string().describe('URL of the scraped page'),
            status: z.string().describe('Page scrape status'),
            error: z
              .string()
              .optional()
              .nullable()
              .describe('Error message if page scrape failed'),
            metadata: z.record(z.string(), z.any()).optional().describe('Page metadata'),
            markdown: z.string().optional().describe('Markdown content'),
            html: z.string().optional().describe('HTML content'),
            links: z.array(z.string()).optional().describe('Links found'),
            screenshot: z.string().optional().describe('Screenshot data')
          })
        )
        .optional()
        .describe('Scraped page results'),
      error: z.string().optional().describe('Error message if job failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HyperbrowserClient({ token: ctx.auth.token });

    let params: Record<string, unknown> = { urls: ctx.input.urls };
    if (ctx.input.scrapeOptions) params.scrapeOptions = ctx.input.scrapeOptions;
    if (ctx.input.sessionOptions) params.sessionOptions = ctx.input.sessionOptions;

    ctx.info(`Starting batch scrape job for ${ctx.input.urls.length} URLs`);
    let startResponse = await client.startBatchScrapeJob(params);
    let jobId = startResponse.jobId;

    ctx.progress('Waiting for batch scrape job to complete...');
    let result = await client.pollForCompletion(
      () => client.getBatchScrapeJobStatus(jobId),
      () => client.getBatchScrapeJobResult(jobId)
    );

    let pages = result.data as Record<string, unknown>[] | undefined;

    return {
      output: {
        jobId,
        status: result.status as string,
        totalScrapedPages: result.totalScrapedPages as number | undefined,
        pages: pages?.map(p => ({
          url: p.url as string,
          status: p.status as string,
          error: p.error as string | null | undefined,
          metadata: p.metadata as Record<string, unknown> | undefined,
          markdown: p.markdown as string | undefined,
          html: p.html as string | undefined,
          links: p.links as string[] | undefined,
          screenshot: p.screenshot as string | undefined
        })),
        error: result.error as string | undefined
      },
      message: `Batch scrape completed. **${pages?.length ?? 0}** of **${ctx.input.urls.length}** pages scraped.`
    };
  })
  .build();
