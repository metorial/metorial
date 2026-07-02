import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrowserlessClient } from '../lib/client';
import { browserlessServiceError } from '../lib/errors';
import { spec } from '../spec';
import { requireHttpUrl } from './shared';

let crawlStatusSchema = z.enum(['in-progress', 'completed', 'failed', 'cancelled']);
let crawlScrapeFormatSchema = z.enum(['markdown', 'html', 'rawText']);

let requireCrawlId = (crawlId: string | undefined, action: string) => {
  if (!crawlId?.trim()) {
    throw browserlessServiceError(`crawlId is required for ${action}.`);
  }
};

export let manageCrawl = SlateTool.create(spec, {
  name: 'Manage Crawls',
  key: 'manage_crawl',
  description: `Start, inspect, list, or cancel Browserless Crawl jobs. Crawls asynchronously discover site URLs and scrape pages into structured, LLM-ready results.`,
  instructions: [
    'Use action "start" with url to create a crawl job.',
    'Use action "get" with crawlId to poll status and retrieve paginated page metadata.',
    'Use action "list" to inspect recent crawl jobs.',
    'Use action "cancel" with crawlId to stop an in-progress crawl.'
  ],
  constraints: [
    'The Crawl API is beta and available on Browserless Cloud plans.',
    'Crawl page content is exposed by Browserless as short-lived contentUrl values.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['start', 'get', 'list', 'cancel'])
        .describe('Crawl operation to perform'),
      url: z.string().optional().describe('HTTP or HTTPS URL to crawl for action "start"'),
      crawlId: z.string().optional().describe('Crawl job ID for actions "get" and "cancel"'),
      skip: z
        .number()
        .min(0)
        .optional()
        .describe('Number of page results to skip for action "get" pagination'),
      limit: z
        .number()
        .min(1)
        .max(5000)
        .optional()
        .describe('Maximum crawls to list, or maximum pages to crawl when starting'),
      cursor: z.string().optional().describe('Pagination cursor for action "list"'),
      status: crawlStatusSchema.optional().describe('Status filter for action "list"'),
      maxDepth: z.number().min(0).max(20).optional().describe('Maximum link-follow depth'),
      maxRetries: z
        .number()
        .min(0)
        .max(5)
        .optional()
        .describe('Retry attempts per failed page'),
      allowExternalLinks: z.boolean().optional().describe('Follow links to external domains'),
      allowSubdomains: z.boolean().optional().describe('Follow links to subdomains'),
      sitemap: z
        .enum(['auto', 'force', 'skip'])
        .optional()
        .describe('Sitemap handling strategy for action "start"'),
      includePaths: z
        .array(z.string())
        .optional()
        .describe('Regex URL path patterns to include for action "start"'),
      excludePaths: z
        .array(z.string())
        .optional()
        .describe('Regex URL path patterns to exclude for action "start"'),
      delay: z
        .number()
        .min(0)
        .max(10_000)
        .optional()
        .describe('Delay between crawl requests in milliseconds'),
      scrapeFormats: z
        .array(crawlScrapeFormatSchema)
        .optional()
        .describe('Per-page scrape formats for action "start"'),
      onlyMainContent: z
        .boolean()
        .optional()
        .describe('Extract only main content for each crawled page'),
      includeTags: z
        .array(z.string())
        .optional()
        .describe('HTML selectors or tags to include in crawled content'),
      excludeTags: z
        .array(z.string())
        .optional()
        .describe('HTML selectors or tags to exclude from crawled content'),
      waitFor: z
        .number()
        .min(0)
        .max(30_000)
        .optional()
        .describe('Milliseconds to wait after page load before scraping'),
      pageTimeout: z
        .number()
        .min(1_000)
        .max(180_000)
        .optional()
        .describe('Per-page navigation timeout in milliseconds'),
      headers: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom HTTP headers for page requests'),
      proxy: z
        .enum(['residential', 'datacenter'])
        .optional()
        .describe('Proxy network for page fetches'),
      webhookUrl: z
        .string()
        .optional()
        .describe('HTTPS webhook URL for Browserless crawl notifications'),
      webhookEvents: z
        .array(z.enum(['page', 'completed', 'failed']))
        .optional()
        .describe('Webhook events to send'),
      profile: z
        .string()
        .optional()
        .describe('Saved Browserless authenticated profile name for action "start"')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Action that was performed'),
      success: z.boolean().optional().describe('Whether Browserless reported success'),
      crawlId: z.string().optional().describe('Crawl job ID'),
      pollUrl: z.string().optional().describe('Browserless status URL for the crawl'),
      status: crawlStatusSchema.optional().describe('Current crawl status'),
      total: z.number().optional().describe('Total pages discovered'),
      completed: z.number().optional().describe('Pages successfully scraped'),
      failed: z.number().optional().describe('Pages that failed to scrape'),
      expiresAt: z.string().nullable().optional().describe('Result expiration timestamp'),
      next: z.string().nullable().optional().describe('Next page URL for crawl results'),
      pages: z
        .array(
          z.object({
            status: z.string().optional(),
            contentUrl: z.string().nullable().optional(),
            metadata: z.any().optional()
          })
        )
        .optional()
        .describe('Crawled page result metadata for action "get"'),
      crawls: z
        .array(
          z.object({
            id: z.string().optional(),
            url: z.string().optional(),
            status: z.string().optional(),
            total: z.number().optional(),
            completed: z.number().optional(),
            createdAt: z.string().optional(),
            completedAt: z.string().nullable().optional()
          })
        )
        .optional()
        .describe('Crawl job summaries for action "list"'),
      nextCursor: z.string().nullable().optional().describe('Cursor for the next list page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrowserlessClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    if (ctx.input.action === 'start') {
      requireHttpUrl(ctx.input.url, 'url');
      if (ctx.input.webhookUrl) {
        let parsed: URL;
        try {
          parsed = new URL(ctx.input.webhookUrl);
        } catch {
          throw browserlessServiceError('webhookUrl must be a valid URL.');
        }
        if (parsed.protocol !== 'https:') {
          throw browserlessServiceError('webhookUrl must use https://.');
        }
      }

      let result = await client.startCrawl(
        {
          url: ctx.input.url!,
          limit: ctx.input.limit,
          maxDepth: ctx.input.maxDepth,
          maxRetries: ctx.input.maxRetries,
          allowExternalLinks: ctx.input.allowExternalLinks,
          allowSubdomains: ctx.input.allowSubdomains,
          sitemap: ctx.input.sitemap,
          includePaths: ctx.input.includePaths,
          excludePaths: ctx.input.excludePaths,
          delay: ctx.input.delay,
          scrapeOptions:
            ctx.input.scrapeFormats ||
            ctx.input.onlyMainContent !== undefined ||
            ctx.input.includeTags ||
            ctx.input.excludeTags ||
            ctx.input.waitFor !== undefined ||
            ctx.input.pageTimeout !== undefined ||
            ctx.input.headers ||
            ctx.input.proxy
              ? {
                  formats: ctx.input.scrapeFormats,
                  onlyMainContent: ctx.input.onlyMainContent,
                  includeTags: ctx.input.includeTags,
                  excludeTags: ctx.input.excludeTags,
                  waitFor: ctx.input.waitFor,
                  timeout: ctx.input.pageTimeout,
                  headers: ctx.input.headers,
                  proxy: ctx.input.proxy
                }
              : undefined,
          webhook: ctx.input.webhookUrl
            ? {
                url: ctx.input.webhookUrl,
                events: ctx.input.webhookEvents
              }
            : undefined
        },
        { profile: ctx.input.profile }
      );

      return {
        output: {
          action: ctx.input.action,
          success: result?.success,
          crawlId: result?.id,
          pollUrl: result?.url
        },
        message: `Started crawl ${result?.id ?? ''} for ${ctx.input.url}.`
      };
    }

    if (ctx.input.action === 'get') {
      requireCrawlId(ctx.input.crawlId, 'get');
      let result = await client.getCrawl(ctx.input.crawlId!, ctx.input.skip);
      return {
        output: {
          action: ctx.input.action,
          status: result?.status,
          total: result?.total,
          completed: result?.completed,
          failed: result?.failed,
          expiresAt: result?.expiresAt,
          next: result?.next,
          pages: Array.isArray(result?.data) ? result.data : []
        },
        message: `Crawl ${ctx.input.crawlId} is ${result?.status ?? 'unknown'}.`
      };
    }

    if (ctx.input.action === 'list') {
      if (ctx.input.limit && ctx.input.limit > 100) {
        throw browserlessServiceError('limit cannot exceed 100 for list crawls.');
      }

      let result = await client.listCrawls({
        limit: ctx.input.limit,
        cursor: ctx.input.cursor,
        status: ctx.input.status
      });
      let crawls = Array.isArray(result?.crawls) ? result.crawls : [];
      return {
        output: {
          action: ctx.input.action,
          crawls,
          nextCursor: result?.nextCursor
        },
        message: `Listed **${crawls.length}** crawl job(s).`
      };
    }

    requireCrawlId(ctx.input.crawlId, 'cancel');
    let result = await client.cancelCrawl(ctx.input.crawlId!);
    return {
      output: {
        action: ctx.input.action,
        status: result?.status
      },
      message: `Cancelled crawl ${ctx.input.crawlId}.`
    };
  })
  .build();
