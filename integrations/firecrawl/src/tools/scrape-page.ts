import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import {
  buildScrapeOptions,
  commonScrapeInputShape,
  normalizePageData,
  pageDataSchema
} from './shared';

export let scrapePageTool = SlateTool.create(spec, {
  name: 'Scrape Page',
  key: 'scrape_page',
  description: `Scrape a single URL with Firecrawl v2 and extract markdown, HTML, raw HTML, links, screenshots, images, audio/video URLs, structured JSON, summaries, brand data, answers, highlights, or change tracking data. Use this when you have a known URL and need clean page content or a single-page extraction.`,
  instructions: [
    'Provide the URL you want to scrape. By default, Firecrawl returns markdown.',
    'Use formats to request additional output types. For json/question/highlights formats, provide the matching companion field.',
    'Use actions, profile fields, proxy, cache, location, and parser fields for dynamic or authenticated pages.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL of the web page to scrape'),
      ...commonScrapeInputShape
    })
  )
  .output(
    pageDataSchema.extend({
      scrapeId: z
        .string()
        .optional()
        .describe('Scrape job ID from metadata, used with interaction and status tools'),
      success: z
        .boolean()
        .optional()
        .describe('Whether Firecrawl marked the request successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.scrape({
      url: ctx.input.url,
      ...buildScrapeOptions(ctx.input)
    });

    let data = result.data ?? result;
    let normalized = normalizePageData(data);
    let scrapeId = data.metadata?.scrapeId ?? result.id;

    return {
      output: {
        ...normalized,
        scrapeId,
        success: result.success
      },
      message: `Successfully scraped **${ctx.input.url}**${normalized.metadata?.title ? ` - "${normalized.metadata.title}"` : ''}. Returned formats: ${(ctx.input.formats ?? ['markdown']).join(', ')}.`
    };
  });
