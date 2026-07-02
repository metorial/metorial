import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let crawlWebsite = SlateTool.create(spec, {
  name: 'Crawl Website',
  key: 'crawl_website',
  description: `Crawls multiple pages of a website starting from a given URL, following links with configurable depth and breadth.
Two modes: **AI extraction** (structured output with a prompt) and **markdown conversion** (no AI, lower cost). Supports crawl rules for include/exclude paths, sitemap-based discovery, and webhook notifications on completion.`,
  instructions: [
    'Set extractionMode to false for markdown-only crawling without AI processing (80% cheaper).',
    'Provide a prompt when using AI extraction mode to specify what data to extract from each page.',
    'Use rules to control which paths are crawled (include/exclude patterns with wildcards).'
  ],
  constraints: ['Maximum pages default is 20. Increase maxPages for larger crawls.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('Starting URL for the crawl'),
      prompt: z
        .string()
        .optional()
        .describe('Instructions on what data to extract (required for AI extraction mode)'),
      depth: z.number().optional().describe('Number of link levels to follow (default: 1)'),
      breadth: z
        .number()
        .optional()
        .describe('Maximum links to follow per depth level (null for unlimited)'),
      maxPages: z.number().optional().describe('Maximum total pages to crawl (default: 20)'),
      extractionMode: z
        .boolean()
        .optional()
        .describe(
          'true for AI-powered extraction (default), false for markdown conversion mode'
        ),
      outputSchema: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('JSON schema defining the structure of the expected output per page'),
      rules: z
        .object({
          includePaths: z
            .array(z.string())
            .optional()
            .describe('Path patterns to include (supports wildcards, e.g., "/products/*")'),
          excludePaths: z
            .array(z.string())
            .optional()
            .describe('Path patterns to exclude (takes precedence over includePaths)'),
          sameDomain: z.boolean().optional().describe('Only crawl pages on the same domain'),
          exclude: z
            .array(z.string())
            .optional()
            .describe('Regex patterns to exclude from crawling')
        })
        .optional()
        .describe('Rules for controlling crawl behavior'),
      sitemap: z.boolean().optional().describe('Use sitemap.xml for page discovery'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive a POST notification when the crawl completes'),
      waitMs: z
        .number()
        .optional()
        .describe('Milliseconds to wait per page load (default: 3000)')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the crawl job (e.g., "done")'),
      llmResult: z
        .unknown()
        .optional()
        .describe('Structured extraction results from AI processing'),
      crawledUrls: z.array(z.string()).optional().describe('List of URLs that were crawled'),
      pages: z
        .array(
          z.object({
            url: z.string().describe('URL of the crawled page'),
            markdown: z.string().optional().describe('Markdown content of the page')
          })
        )
        .optional()
        .describe('Array of crawled pages with their content'),
      error: z.string().nullable().optional().describe('Error message if the crawl failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.crawl({
      url: ctx.input.url,
      prompt: ctx.input.prompt,
      depth: ctx.input.depth,
      breadth: ctx.input.breadth,
      maxPages: ctx.input.maxPages,
      extractionMode: ctx.input.extractionMode,
      schema: ctx.input.outputSchema,
      rules: ctx.input.rules,
      sitemap: ctx.input.sitemap,
      webhookUrl: ctx.input.webhookUrl,
      waitMs: ctx.input.waitMs
    });

    let crawledCount = (response.crawled_urls || []).length;

    return {
      output: {
        status: response.status,
        llmResult: response.llm_result,
        crawledUrls: response.crawled_urls,
        pages: response.pages,
        error: response.error
      },
      message: `Crawled **${ctx.input.url}** - Status: **${response.status}**. Crawled **${crawledCount}** page(s).`
    };
  })
  .build();
