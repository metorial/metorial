import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scrapeWeb = SlateTool.create(spec, {
  name: 'Scrape Website',
  key: 'scrape_web',
  description: `Intelligently scrape any website using AI to extract structured data. Provide a URL or raw HTML along with natural language prompts describing what data to extract, and the API returns structured results consistently across different sites. You can also use CSS selectors for precise targeting.`,
  instructions: [
    'Provide either a URL or raw HTML content, not both.',
    'Use element prompts to describe data you want in natural language (e.g., "product name", "price", "review count").',
    'CSS selectors can be used alongside or instead of element prompts for precise targeting.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().optional().describe('URL of the website to scrape'),
      html: z.string().optional().describe('Raw HTML content to scrape (use instead of url)'),
      elementPrompts: z
        .array(z.string())
        .optional()
        .describe(
          'Natural language descriptions of data to extract (max 5), e.g. ["product name", "price", "rating"]'
        ),
      selectors: z
        .array(z.string())
        .optional()
        .describe('CSS selectors to target specific elements'),
      rootElementSelector: z
        .string()
        .optional()
        .describe('CSS selector to scope the scraping area (defaults to "main")'),
      scroll: z
        .boolean()
        .optional()
        .describe('Whether to auto-scroll the full page before scraping'),
      pagePosition: z.number().optional().describe('Page number for paginated results'),
      httpHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom HTTP headers to include in the request'),
      width: z.number().optional().describe('Viewport width in pixels (default: 1920)'),
      height: z.number().optional().describe('Viewport height in pixels (default: 1080)'),
      isMobile: z.boolean().optional().describe('Emulate mobile viewport')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the scrape was successful'),
      data: z
        .array(
          z.object({
            key: z.string().optional(),
            selector: z.string().optional(),
            results: z.array(z.unknown()).optional()
          })
        )
        .optional()
        .describe('Scraped data organized by element prompts or selectors'),
      context: z
        .record(z.string(), z.array(z.string()))
        .optional()
        .describe('Extracted context keyed by element prompt'),
      selectors: z
        .record(z.string(), z.array(z.string()))
        .optional()
        .describe('Matched selectors'),
      pagePosition: z.number().optional().describe('Current page position'),
      pagePositionLength: z.number().optional().describe('Total number of pages available'),
      meta: z
        .object({
          title: z.string().optional(),
          description: z.string().optional(),
          keywords: z.string().optional(),
          ogImage: z.string().optional()
        })
        .optional()
        .describe('Page metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.scrapeWeb({
      url: ctx.input.url,
      html: ctx.input.html,
      elementPrompts: ctx.input.elementPrompts,
      selectors: ctx.input.selectors,
      rootElementSelector: ctx.input.rootElementSelector,
      scroll: ctx.input.scroll,
      pagePosition: ctx.input.pagePosition,
      httpHeaders: ctx.input.httpHeaders,
      width: ctx.input.width,
      height: ctx.input.height,
      isMobile: ctx.input.isMobile
    });

    let source = ctx.input.url || 'provided HTML';
    let promptCount = ctx.input.elementPrompts?.length ?? 0;

    return {
      output: {
        success: result.success,
        data: result.data,
        context: result.context,
        selectors: result.selectors,
        pagePosition: result.page_position,
        pagePositionLength: result.page_position_length,
        meta: result.meta
          ? {
              title: result.meta.title,
              description: result.meta.description,
              keywords: result.meta.keywords,
              ogImage: result.meta.og_image
            }
          : undefined
      },
      message: `Scraped **${source}**${promptCount > 0 ? ` with ${promptCount} element prompts` : ''}. ${result.success ? 'Data extracted successfully.' : 'Scraping failed.'}`
    };
  })
  .build();
