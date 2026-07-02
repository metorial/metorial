import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { buildNestedScrapeOptions, commonScrapeInputShape } from './shared';

let crawlErrorSchema = z.object({
  id: z.string().optional().describe('Failed scrape job ID'),
  timestamp: z.string().optional().describe('Failure timestamp'),
  url: z.string().optional().describe('URL that failed'),
  error: z.string().optional().describe('Error message')
});

export let cancelCrawlTool = SlateTool.create(spec, {
  name: 'Cancel Crawl',
  key: 'cancel_crawl',
  description: `Cancel a running Firecrawl crawl job.`,
  instructions: ['Provide the crawlId returned by Crawl Website.'],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      crawlId: z.string().describe('The ID of the crawl job to cancel')
    })
  )
  .output(
    z.object({
      status: z.string().optional().describe('Cancellation status'),
      success: z.boolean().optional().describe('Whether Firecrawl accepted the cancellation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.cancelCrawl(ctx.input.crawlId);

    return {
      output: {
        status: result.status,
        success: result.success
      },
      message: `Cancelled crawl job \`${ctx.input.crawlId}\`.`
    };
  });

export let getCrawlErrorsTool = SlateTool.create(spec, {
  name: 'Get Crawl Errors',
  key: 'get_crawl_errors',
  description: `Retrieve failed URLs and robots.txt blocked URLs for a Firecrawl crawl job.`,
  instructions: ['Provide the crawlId returned by Crawl Website.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      crawlId: z.string().describe('The ID of the crawl job')
    })
  )
  .output(
    z.object({
      errors: z.array(crawlErrorSchema).describe('Failed scrape jobs and details'),
      robotsBlocked: z.array(z.string()).optional().describe('URLs blocked by robots.txt')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getCrawlErrors(ctx.input.crawlId);
    let errors = Array.isArray(result.errors) ? result.errors : [];

    return {
      output: {
        errors,
        robotsBlocked: result.robotsBlocked
      },
      message: `Retrieved **${errors.length}** crawl error(s) for \`${ctx.input.crawlId}\`.`
    };
  });

export let previewCrawlParamsTool = SlateTool.create(spec, {
  name: 'Preview Crawl Params',
  key: 'preview_crawl_params',
  description: `Preview Firecrawl crawl parameters generated from a prompt and explicit crawl options without starting a crawl job.`,
  instructions: [
    'Use this to inspect prompt-generated crawl settings before starting a crawl.',
    'Explicit parameters override generated equivalents.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().optional().describe('The base URL to preview crawl settings for'),
      prompt: z.string().optional().describe('Natural-language crawl parameter prompt'),
      limit: z.number().optional().describe('Maximum number of pages to crawl'),
      maxDiscoveryDepth: z.number().optional().describe('Maximum discovery depth'),
      includePaths: z.array(z.string()).optional().describe('URL pathname regexes to include'),
      excludePaths: z.array(z.string()).optional().describe('URL pathname regexes to exclude'),
      allowExternalLinks: z.boolean().optional().describe('Follow external domains'),
      allowSubdomains: z.boolean().optional().describe('Follow subdomains'),
      crawlEntireDomain: z.boolean().optional().describe('Crawl the entire domain'),
      sitemap: z.enum(['skip', 'include', 'only']).optional().describe('Sitemap mode'),
      ...commonScrapeInputShape
    })
  )
  .output(
    z.object({
      preview: z.record(z.string(), z.any()).describe('Previewed crawl parameters')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let scrapeOptions = buildNestedScrapeOptions(ctx.input);
    let result = await client.previewCrawlParams({
      url: ctx.input.url,
      prompt: ctx.input.prompt,
      limit: ctx.input.limit,
      maxDiscoveryDepth: ctx.input.maxDiscoveryDepth,
      includePaths: ctx.input.includePaths,
      excludePaths: ctx.input.excludePaths,
      allowExternalLinks: ctx.input.allowExternalLinks,
      allowSubdomains: ctx.input.allowSubdomains,
      crawlEntireDomain: ctx.input.crawlEntireDomain,
      sitemap: ctx.input.sitemap,
      scrapeOptions: Object.keys(scrapeOptions).length > 0 ? (scrapeOptions as any) : undefined
    });

    return {
      output: {
        preview: result
      },
      message: 'Previewed Firecrawl crawl parameters.'
    };
  });

export let getActiveCrawlsTool = SlateTool.create(spec, {
  name: 'Get Active Crawls',
  key: 'get_active_crawls',
  description: `List active Firecrawl crawl jobs for the authenticated team.`,
  instructions: ['Use this to inspect currently running crawls before starting more work.'],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      activeCrawls: z.array(z.any()).describe('Active crawl jobs returned by Firecrawl'),
      success: z
        .boolean()
        .optional()
        .describe('Whether Firecrawl marked the request successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getActiveCrawls();
    let activeCrawls = result.activeCrawls ?? result.data ?? result.crawls ?? [];

    return {
      output: {
        activeCrawls: Array.isArray(activeCrawls) ? activeCrawls : [],
        success: result.success
      },
      message: `Retrieved **${Array.isArray(activeCrawls) ? activeCrawls.length : 0}** active crawl(s).`
    };
  });
