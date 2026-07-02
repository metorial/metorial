import { SlateTool } from 'slates';
import { z } from 'zod';
import { HyperbrowserClient } from '../lib/client';
import { scrapeOptionsSchema, sessionOptionsSchema } from '../lib/schemas';
import { spec } from '../spec';

export let crawlWebsite = SlateTool.create(spec, {
  name: 'Crawl Website',
  key: 'crawl_website',
  description: `Crawl an entire website starting from a URL, following links to subpages and extracting content from each page.
Starts the crawl job, waits for completion, and returns all crawled page content. Useful for gathering data across an entire site.`,
  instructions: [
    'Provide the starting URL with full protocol.',
    'Use maxPages to limit the crawl scope (default: 10, max: 100).',
    'Use includePatterns/excludePatterns to filter which URLs to crawl.'
  ],
  constraints: ['Maximum of 100 pages per crawl job.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('Starting URL for the crawl'),
      maxPages: z
        .number()
        .optional()
        .describe('Maximum number of pages to crawl (default: 10, max: 100)'),
      followLinks: z
        .boolean()
        .optional()
        .describe('Whether to follow links on crawled pages (default: true)'),
      ignoreSitemap: z
        .boolean()
        .optional()
        .describe('Whether to ignore the sitemap (default: false)'),
      excludePatterns: z
        .array(z.string())
        .optional()
        .describe('URL patterns to exclude from crawling'),
      includePatterns: z
        .array(z.string())
        .optional()
        .describe('URL patterns to include in crawling'),
      scrapeOptions: scrapeOptionsSchema,
      sessionOptions: sessionOptionsSchema
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Crawl job identifier'),
      status: z.string().describe('Job status'),
      totalCrawledPages: z.number().optional().describe('Total number of pages crawled'),
      pages: z
        .array(
          z.object({
            url: z.string().describe('URL of the crawled page'),
            status: z.string().describe('Page crawl status'),
            error: z
              .string()
              .optional()
              .nullable()
              .describe('Error message if page crawl failed'),
            metadata: z.record(z.string(), z.any()).optional().describe('Page metadata'),
            markdown: z.string().optional().describe('Markdown content'),
            html: z.string().optional().describe('HTML content'),
            links: z.array(z.string()).optional().describe('Links found')
          })
        )
        .optional()
        .describe('Crawled page results'),
      error: z.string().optional().describe('Error message if job failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HyperbrowserClient({ token: ctx.auth.token });

    let params: Record<string, unknown> = { url: ctx.input.url };
    if (ctx.input.maxPages !== undefined) params.maxPages = ctx.input.maxPages;
    if (ctx.input.followLinks !== undefined) params.followLinks = ctx.input.followLinks;
    if (ctx.input.ignoreSitemap !== undefined) params.ignoreSitemap = ctx.input.ignoreSitemap;
    if (ctx.input.excludePatterns) params.excludePatterns = ctx.input.excludePatterns;
    if (ctx.input.includePatterns) params.includePatterns = ctx.input.includePatterns;
    if (ctx.input.scrapeOptions) params.scrapeOptions = ctx.input.scrapeOptions;
    if (ctx.input.sessionOptions) params.sessionOptions = ctx.input.sessionOptions;

    ctx.info(`Starting crawl job for ${ctx.input.url}`);
    let startResponse = await client.startCrawlJob(params);
    let jobId = startResponse.jobId;

    ctx.progress('Waiting for crawl job to complete...');
    let result = await client.pollForCompletion(
      () => client.getCrawlJobStatus(jobId),
      () => client.getCrawlJobResult(jobId)
    );

    let pages = result.data as Record<string, unknown>[] | undefined;

    return {
      output: {
        jobId,
        status: result.status as string,
        totalCrawledPages: result.totalCrawledPages as number | undefined,
        pages: pages?.map(p => ({
          url: p.url as string,
          status: p.status as string,
          error: p.error as string | null | undefined,
          metadata: p.metadata as Record<string, unknown> | undefined,
          markdown: p.markdown as string | undefined,
          html: p.html as string | undefined,
          links: p.links as string[] | undefined
        })),
        error: result.error as string | undefined
      },
      message: `Crawl completed for **${ctx.input.url}**. **${result.totalCrawledPages ?? pages?.length ?? 0}** pages crawled.`
    };
  })
  .build();
