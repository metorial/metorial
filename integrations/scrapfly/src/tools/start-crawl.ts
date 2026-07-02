import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let startCrawl = SlateTool.create(spec, {
  name: 'Start Crawl',
  key: 'start_crawl',
  description: `Start a recursive website crawl from a given URL. The crawler automatically discovers and follows links, respecting configurable limits for page count, depth, duration, and budget. Supports URL path filtering, external domain control, proxy rotation, anti-bot bypass, and multiple content formats.`,
  instructions: [
    'Set **pageLimit** to control how many pages to crawl (0 = unlimited).',
    'Use **includeOnlyPaths** and **excludePaths** to filter which URL paths are crawled.',
    'Set **contentFormats** to specify desired output formats (e.g., ["markdown", "html"]).',
    'Use the Get Crawl Status tool to monitor progress after starting a crawl.'
  ],
  constraints: [
    'The Crawler API is in early access and features may change.',
    'Maximum crawl duration is 10800 seconds (3 hours).',
    'Maximum 100 exclude/include path rules.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z.string().describe('Starting URL for the crawl. Must be a valid HTTP/HTTPS URL.'),
      pageLimit: z
        .number()
        .optional()
        .describe('Maximum number of pages to crawl. 0 for unlimited.'),
      maxDepth: z.number().optional().describe('Maximum link depth from the starting URL.'),
      maxDuration: z
        .number()
        .optional()
        .describe('Maximum crawl duration in seconds (15-10800).'),
      maxApiCredit: z
        .number()
        .optional()
        .describe('Maximum API credits to spend. 0 for no limit.'),
      excludePaths: z
        .array(z.string())
        .optional()
        .describe('URL path patterns to exclude from crawling.'),
      includeOnlyPaths: z
        .array(z.string())
        .optional()
        .describe('Only crawl URLs matching these path patterns.'),
      ignoreBasePathRestriction: z
        .boolean()
        .optional()
        .describe('Allow crawling any path on the same domain.'),
      followExternalLinks: z
        .boolean()
        .optional()
        .describe('Allow following links to external domains.'),
      allowedExternalDomains: z
        .array(z.string())
        .optional()
        .describe('Whitelist of external domains to follow (supports wildcards).'),
      followInternalSubdomains: z
        .boolean()
        .optional()
        .describe('Allow following links to subdomains.'),
      contentFormats: z
        .array(z.string())
        .optional()
        .describe(
          'Output formats: html, clean_html, markdown, text, json, extracted_data, page_metadata.'
        ),
      extractionRules: z
        .any()
        .optional()
        .describe('Extraction rules for structured data extraction from crawled pages.'),
      renderingDelay: z
        .number()
        .optional()
        .describe('Wait time in ms after page load (0-25000).'),
      maxConcurrency: z.number().optional().describe('Maximum concurrent scrape requests.'),
      delay: z
        .string()
        .optional()
        .describe('Delay between requests in milliseconds (0-15000).'),
      useSitemaps: z.boolean().optional().describe('Use sitemap.xml for URL discovery.'),
      respectRobotsTxt: z.boolean().optional().describe('Respect robots.txt rules.'),
      cache: z.boolean().optional().describe('Enable cache for crawled pages.'),
      proxyPool: z
        .enum(['public_datacenter_pool', 'public_residential_pool'])
        .optional()
        .describe('Proxy pool to use.'),
      country: z.string().optional().describe('Proxy country code (ISO 3166-1 alpha-2).'),
      asp: z.boolean().optional().describe('Enable Anti-Scraping Protection bypass.')
    })
  )
  .output(
    z.object({
      crawlUuid: z.string().describe('UUID of the created crawl job.'),
      status: z.string().describe('Initial status of the crawl job.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.createCrawl({
      url: ctx.input.url,
      pageLimit: ctx.input.pageLimit,
      maxDepth: ctx.input.maxDepth,
      maxDuration: ctx.input.maxDuration,
      maxApiCredit: ctx.input.maxApiCredit,
      excludePaths: ctx.input.excludePaths,
      includeOnlyPaths: ctx.input.includeOnlyPaths,
      ignoreBasePathRestriction: ctx.input.ignoreBasePathRestriction,
      followExternalLinks: ctx.input.followExternalLinks,
      allowedExternalDomains: ctx.input.allowedExternalDomains,
      followInternalSubdomains: ctx.input.followInternalSubdomains,
      contentFormats: ctx.input.contentFormats,
      extractionRules: ctx.input.extractionRules,
      renderingDelay: ctx.input.renderingDelay,
      maxConcurrency: ctx.input.maxConcurrency,
      delay: ctx.input.delay,
      useSitemaps: ctx.input.useSitemaps,
      respectRobotsTxt: ctx.input.respectRobotsTxt,
      cache: ctx.input.cache,
      proxyPool: ctx.input.proxyPool,
      country: ctx.input.country,
      asp: ctx.input.asp
    });

    return {
      output: {
        crawlUuid: result.uuid,
        status: result.status
      },
      message: `Started crawl of **${ctx.input.url}**. Crawl UUID: \`${result.uuid}\`. Status: ${result.status}.${ctx.input.pageLimit ? ` Page limit: ${ctx.input.pageLimit}.` : ''}`
    };
  })
  .build();
