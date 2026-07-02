import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let mapWebsite = SlateTool.create(spec, {
  name: 'Map Website',
  key: 'map_website',
  description: `Discover and list all URLs on a website by traversing its link structure, without extracting content. Returns a flat list of discovered URLs. Useful for understanding site structure before crawling or extracting specific pages.`,
  instructions: [
    'Use this before crawling to understand the site structure and identify which pages to target.',
    'Use selectPaths/excludePaths with regex patterns to focus on specific sections of a site.'
  ],
  constraints: [
    'Maximum depth of 5 levels.',
    'Maximum breadth of 500 links per level.',
    'Timeout range is 10-150 seconds (default 150).',
    'Using instructions doubles the cost (2 credits per 10 pages).'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The root URL to begin mapping'),
      instructions: z
        .string()
        .optional()
        .describe('Natural language instructions to guide URL discovery'),
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
        .describe('Regex patterns to limit mapping to specific domains'),
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
      baseUrl: z.string().describe('The root URL that was mapped'),
      urls: z.array(z.string()).describe('List of discovered URLs'),
      totalUrls: z.number().describe('Total number of URLs discovered'),
      responseTime: z.number().describe('Time to complete the request in seconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let result = await client.map({
      url: ctx.input.url,
      instructions: ctx.input.instructions,
      maxDepth: ctx.input.maxDepth,
      maxBreadth: ctx.input.maxBreadth,
      limit: ctx.input.limit,
      selectPaths: ctx.input.selectPaths,
      selectDomains: ctx.input.selectDomains,
      excludePaths: ctx.input.excludePaths,
      excludeDomains: ctx.input.excludeDomains,
      allowExternal: ctx.input.allowExternal,
      timeout: ctx.input.timeout
    });

    let urlCount = result.results.length;

    return {
      output: {
        baseUrl: result.baseUrl,
        urls: result.results,
        totalUrls: urlCount,
        responseTime: result.responseTime
      },
      message: `Mapped **${urlCount} URL${urlCount !== 1 ? 's' : ''}** starting from **${result.baseUrl}** in ${result.responseTime.toFixed(2)}s.`
    };
  })
  .build();
