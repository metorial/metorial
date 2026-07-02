import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let crawlWebsite = SlateTool.create(spec, {
  name: 'Crawl Website',
  key: 'crawl_website',
  description: `Traverse a website starting from a root URL, following links across pages with built-in content extraction. Returns extracted content from each discovered page. Supports natural language instructions to guide the crawler, path/domain filtering via regex, and configurable depth and breadth controls.`,
  instructions: [
    'Use natural language instructions (e.g., "Find all pages about pricing") to guide the crawler to relevant pages.',
    'Use selectPaths/excludePaths with regex patterns to filter URL paths.',
    'Start with lower depth and breadth values and increase as needed to control costs.'
  ],
  constraints: [
    'Maximum crawl depth of 5 levels.',
    'Maximum breadth of 500 links per level.',
    'Timeout range is 10-150 seconds (default 150).',
    'Using instructions doubles the mapping cost (2 credits per 10 pages).'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The root URL to begin crawling'),
      instructions: z
        .string()
        .optional()
        .describe(
          'Natural language instructions to guide the crawler (e.g., "Find all documentation pages")'
        ),
      chunksPerSource: z
        .number()
        .min(1)
        .max(5)
        .optional()
        .describe('Max content chunks per source (1-5)'),
      maxDepth: z
        .number()
        .min(1)
        .max(5)
        .optional()
        .describe('How far from the base URL to explore (1-5). Defaults to 1'),
      maxBreadth: z
        .number()
        .min(1)
        .max(500)
        .optional()
        .describe('Max links to follow per page level (1-500). Defaults to 20'),
      limit: z
        .number()
        .min(1)
        .optional()
        .describe('Total links to process before stopping. Defaults to 50'),
      selectPaths: z
        .array(z.string())
        .optional()
        .describe('Regex patterns to select only URLs with specific path patterns'),
      selectDomains: z
        .array(z.string())
        .optional()
        .describe('Regex patterns to limit crawling to specific domains'),
      excludePaths: z
        .array(z.string())
        .optional()
        .describe('Regex patterns to exclude URLs matching specific path patterns'),
      excludeDomains: z
        .array(z.string())
        .optional()
        .describe('Regex patterns to exclude specific domains'),
      allowExternal: z
        .boolean()
        .optional()
        .describe('Include links to external domains. Defaults to true'),
      includeImages: z.boolean().optional().describe('Include images in crawl results'),
      extractDepth: z
        .enum(['basic', 'advanced'])
        .optional()
        .describe('Content extraction depth. "advanced" costs 2 credits per 5 extractions'),
      format: z
        .enum(['markdown', 'text'])
        .optional()
        .describe('Content output format. Defaults to "markdown"'),
      timeout: z
        .number()
        .min(10)
        .max(150)
        .optional()
        .describe('Maximum seconds before timeout (10-150). Defaults to 150')
    })
  )
  .output(
    z.object({
      baseUrl: z.string().describe('The root URL that was crawled'),
      results: z
        .array(
          z.object({
            url: z.string().describe('Crawled page URL'),
            rawContent: z.string().describe('Extracted page content'),
            favicon: z.string().optional().describe('Favicon URL')
          })
        )
        .describe('Crawled pages with extracted content'),
      responseTime: z.number().describe('Time to complete the request in seconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let result = await client.crawl({
      url: ctx.input.url,
      instructions: ctx.input.instructions,
      chunksPerSource: ctx.input.chunksPerSource,
      maxDepth: ctx.input.maxDepth,
      maxBreadth: ctx.input.maxBreadth,
      limit: ctx.input.limit,
      selectPaths: ctx.input.selectPaths,
      selectDomains: ctx.input.selectDomains,
      excludePaths: ctx.input.excludePaths,
      excludeDomains: ctx.input.excludeDomains,
      allowExternal: ctx.input.allowExternal,
      includeImages: ctx.input.includeImages,
      extractDepth: ctx.input.extractDepth,
      format: ctx.input.format,
      timeout: ctx.input.timeout
    });

    let pageCount = result.results.length;

    return {
      output: {
        baseUrl: result.baseUrl,
        results: result.results,
        responseTime: result.responseTime
      },
      message: `Crawled **${pageCount} page${pageCount !== 1 ? 's' : ''}** starting from **${result.baseUrl}** in ${result.responseTime.toFixed(2)}s.`
    };
  })
  .build();
