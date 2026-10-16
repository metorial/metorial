import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scrapePage = SlateTool.create(spec, {
  name: 'Generate Alt Text for a Page',
  key: 'scrape_page',
  description:
    'Find image elements in a page URL or raw HTML and queue them for background alt text generation. Returns scrape and queue results, not the final alt text.',
  instructions: [
    'Use list_images or search_images later to retrieve generated alt text. Only source HTML image elements are parsed; JavaScript is not executed.'
  ],
  constraints: [
    'The provider allows three seconds to download and parse the page. Processing images consumes account credits.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      pageUrl: z.string().optional().describe('Public HTTP or HTTPS page URL'),
      html: z
        .string()
        .optional()
        .describe('Raw HTML to parse; may be supplied without pageUrl'),
      lang: z.string().optional().describe('Language code or comma-separated language codes'),
      keywords: z
        .array(z.string())
        .max(6)
        .optional()
        .describe('English keywords for generated alt text'),
      negativeKeywords: z
        .array(z.string())
        .max(6)
        .optional()
        .describe('English keywords to exclude'),
      includeExisting: z
        .boolean()
        .optional()
        .describe('Also process image elements that already have alt text; default false')
    })
  )
  .output(
    z.object({
      pageUrl: z.string().nullable().optional().describe('Scraped page URL, if supplied'),
      totalProcessed: z.number().describe('Images queued for background processing'),
      images: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Scraped image elements with source, existing alt text, dimensions, and skip reason'
        ),
      raw: z.record(z.string(), z.unknown()).describe('Complete provider scrape response')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).scrapePage(ctx.input);
    if (typeof result.total_processed !== 'number' || !Array.isArray(result.scraped_images))
      throw createApiServiceError('AltText.ai returned invalid page processing results.');
    return {
      output: {
        pageUrl:
          typeof result.url === 'string' || result.url === null ? result.url : undefined,
        totalProcessed: result.total_processed,
        images: result.scraped_images,
        raw: result
      },
      message: `Queued **${result.total_processed}** images for alt text generation.`
    };
  })
  .build();
