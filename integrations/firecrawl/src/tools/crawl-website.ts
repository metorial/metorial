import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { buildNestedScrapeOptions, commonScrapeInputShape } from './shared';

let webhookSchema = z.object({
  url: z.string().describe('Webhook URL to notify'),
  headers: z.record(z.string(), z.string()).optional().describe('Headers for webhook calls'),
  metadata: z
    .record(z.string(), z.any())
    .optional()
    .describe('Metadata included in webhook payloads'),
  events: z.array(z.string()).optional().describe('Webhook event names to receive')
});

export let crawlWebsiteTool = SlateTool.create(spec, {
  name: 'Crawl Website',
  key: 'crawl_website',
  description: `Start a Firecrawl v2 crawl job to recursively discover and scrape pages from a website. The crawl runs asynchronously and returns a crawl ID for polling, cancellation, error retrieval, and webhook events.`,
  instructions: [
    'Provide the base URL to start crawling from.',
    'Use includePaths/excludePaths, discovery depth, sitemap mode, and limit to keep crawls focused.',
    'Use scrape option fields to control the content extracted for each crawled page.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The base URL to start crawling from'),
      prompt: z
        .string()
        .optional()
        .describe('Natural-language prompt to generate crawl parameters'),
      limit: z.number().optional().describe('Maximum number of pages to crawl'),
      maxDiscoveryDepth: z
        .number()
        .optional()
        .describe('Maximum link depth to follow from the start URL'),
      includePaths: z
        .array(z.string())
        .optional()
        .describe('URL pathname regex patterns to include'),
      excludePaths: z
        .array(z.string())
        .optional()
        .describe('URL pathname regex patterns to exclude'),
      allowExternalLinks: z.boolean().optional().describe('Follow links to external domains'),
      allowSubdomains: z.boolean().optional().describe('Follow links to subdomains'),
      crawlEntireDomain: z
        .boolean()
        .optional()
        .describe('Crawl sibling and parent URLs of the start URL'),
      ignoreQueryParameters: z.boolean().optional().describe('Ignore query parameters'),
      ignoreRobotsTxt: z.boolean().optional().describe('Ignore robots.txt rules'),
      regexOnFullURL: z.boolean().optional().describe('Apply path regexes to full URLs'),
      robotsUserAgent: z.string().optional().describe('robots.txt user agent to evaluate'),
      sitemap: z
        .enum(['skip', 'include', 'only'])
        .optional()
        .describe('How to handle sitemaps'),
      delay: z.number().optional().describe('Seconds to wait between requests'),
      maxConcurrency: z.number().optional().describe('Maximum concurrent scrape operations'),
      webhook: webhookSchema.optional().describe('Webhook configuration for crawl events'),
      ...commonScrapeInputShape
    })
  )
  .output(
    z.object({
      crawlId: z
        .string()
        .describe('Unique ID for the crawl job; use status/error/cancel tools with it'),
      url: z.string().optional().describe('Status URL for the crawl job'),
      success: z.boolean().optional().describe('Whether Firecrawl accepted the crawl')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let scrapeOptions = buildNestedScrapeOptions(ctx.input);

    let result = await client.startCrawl({
      url: ctx.input.url,
      prompt: ctx.input.prompt,
      limit: ctx.input.limit,
      maxDiscoveryDepth: ctx.input.maxDiscoveryDepth,
      includePaths: ctx.input.includePaths,
      excludePaths: ctx.input.excludePaths,
      allowExternalLinks: ctx.input.allowExternalLinks,
      allowSubdomains: ctx.input.allowSubdomains,
      crawlEntireDomain: ctx.input.crawlEntireDomain,
      ignoreQueryParameters: ctx.input.ignoreQueryParameters,
      ignoreRobotsTxt: ctx.input.ignoreRobotsTxt,
      regexOnFullURL: ctx.input.regexOnFullURL,
      robotsUserAgent: ctx.input.robotsUserAgent,
      sitemap: ctx.input.sitemap,
      delay: ctx.input.delay,
      maxConcurrency: ctx.input.maxConcurrency,
      webhook: ctx.input.webhook,
      zeroDataRetention: ctx.input.zeroDataRetention,
      scrapeOptions: Object.keys(scrapeOptions).length > 0 ? (scrapeOptions as any) : undefined
    });

    return {
      output: {
        crawlId: result.id,
        url: result.url,
        success: result.success
      },
      message: `Started crawl job for **${ctx.input.url}** with ID \`${result.id}\`.`
    };
  });
