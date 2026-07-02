import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { buildNestedScrapeOptions, commonScrapeInputShape } from './shared';

export let extractDataTool = SlateTool.create(spec, {
  name: 'Extract Data',
  key: 'extract_data',
  description: `Start a Firecrawl v2 extraction job that uses AI to transform one or more web pages into structured data. Supports wildcard URLs, natural-language prompts, JSON Schema output, optional web search, and scrape options for source pages.`,
  instructions: [
    'Provide at least one URL and either a prompt, a JSON schema, or both.',
    'Use wildcard URLs like https://example.com/* to extract across a domain.',
    'The extraction runs asynchronously; use Get Extract Status to retrieve results.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      urls: z
        .array(z.string())
        .describe('URLs to extract data from. Supports glob-style wildcard URLs.'),
      prompt: z.string().optional().describe('Natural-language extraction prompt'),
      schema: z
        .record(z.string(), z.any())
        .optional()
        .describe('JSON Schema defining desired extracted data'),
      enableWebSearch: z.boolean().optional().describe('Allow web search for additional data'),
      ignoreSitemap: z.boolean().optional().describe('Ignore sitemap.xml during scanning'),
      includeSubdomains: z.boolean().optional().describe('Include subdomains during scanning'),
      showSources: z.boolean().optional().describe('Include source information in results'),
      ignoreInvalidURLs: z.boolean().optional().describe('Ignore invalid URLs in the request'),
      ...commonScrapeInputShape
    })
  )
  .output(
    z.object({
      extractId: z
        .string()
        .describe('Unique ID for the extract job; use get_extract_status with it'),
      invalidURLs: z
        .array(z.string())
        .optional()
        .describe('Invalid URLs ignored by Firecrawl'),
      success: z.boolean().optional().describe('Whether Firecrawl accepted the extract job')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let scrapeOptions = buildNestedScrapeOptions(ctx.input);

    let result = await client.startExtract({
      urls: ctx.input.urls,
      prompt: ctx.input.prompt,
      schema: ctx.input.schema,
      enableWebSearch: ctx.input.enableWebSearch,
      ignoreSitemap: ctx.input.ignoreSitemap,
      includeSubdomains: ctx.input.includeSubdomains,
      showSources: ctx.input.showSources,
      ignoreInvalidURLs: ctx.input.ignoreInvalidURLs,
      scrapeOptions: Object.keys(scrapeOptions).length > 0 ? (scrapeOptions as any) : undefined
    });

    return {
      output: {
        extractId: result.id,
        invalidURLs: result.invalidURLs,
        success: result.success
      },
      message: `Started extraction job \`${result.id}\` for ${ctx.input.urls.length} URL(s).`
    };
  });
