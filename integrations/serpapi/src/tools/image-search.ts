import { SlateTool } from 'slates';
import { z } from 'zod';
import { receiptMessage, receiptOutput, SerpApiClient } from '../lib/client';
import { searchMetadataSchema } from '../lib/contracts';
import { searchParams } from '../lib/params';
import { spec } from '../spec';

let imageResultSchema = z.object({
  position: z.number().optional().describe('Position in results'),
  title: z.string().optional().describe('Image title'),
  link: z.string().optional().describe('Page URL containing the image'),
  source: z.string().optional().describe('Source website name'),
  thumbnailUrl: z.string().optional().describe('Thumbnail URL'),
  originalUrl: z.string().optional().describe('Original full-size image URL'),
  originalWidth: z.number().optional().describe('Original image width in pixels'),
  originalHeight: z.number().optional().describe('Original image height in pixels'),
  isProduct: z.boolean().optional().describe('Whether the image is a product')
});

export let imageSearchTool = SlateTool.create(spec, {
  name: 'Image Search',
  key: 'image_search',
  description: `Search for images using Google Images, Bing Images, Yahoo Images, or Yandex Images. Returns image titles, thumbnails, source URLs, dimensions, and related content. Also supports Google Lens reverse image search by URL.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe(
          'Image search query (required unless using imageUrl for reverse image search)'
        ),
      imageUrl: z
        .string()
        .optional()
        .describe(
          'URL of an image for reverse image search (Google Lens). When provided, query is optional.'
        ),
      engine: z
        .enum(['google_images', 'bing_images', 'yahoo_images', 'yandex_images', 'google_lens'])
        .default('google_images')
        .describe('Image search engine to use'),
      location: z.string().optional().describe('Location to simulate search from'),
      language: z.string().optional().describe('Language code (e.g., "en")'),
      country: z.string().optional().describe('Country code (e.g., "us")'),
      device: z
        .enum(['desktop', 'tablet', 'mobile'])
        .optional()
        .describe('Device type to emulate'),
      safeSearch: z.boolean().optional().describe('Enable safe search filtering'),
      pageNumber: z.number().optional().describe('Page number for pagination (0-indexed)'),
      startOffset: z
        .number()
        .optional()
        .describe(
          'Exact native Bing Images first offset, starting at 1; mutually exclusive with pageNumber.'
        ),
      async: z
        .boolean()
        .optional()
        .describe(
          'Submit asynchronously and return the native search ID/status. Not compatible with noCache or Ludicrous Speed accounts.'
        ),
      noCache: z.boolean().optional().describe('Force fresh results')
    })
  )
  .output(
    z.object({
      isComplete: z
        .boolean()
        .describe(
          'Whether native search status is Success; queued/processing receipts are incomplete.'
        ),
      pagination: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Native pagination metadata; follow native offsets/tokens without inferring a total.'
        ),
      searchMetadata: searchMetadataSchema.optional(),
      images: z.array(imageResultSchema).describe('Image search results'),
      suggestedSearches: z
        .array(
          z.object({
            name: z.string().optional().describe('Suggested search name'),
            link: z.string().optional().describe('Link to suggested search'),
            thumbnailUrl: z.string().optional().describe('Thumbnail for the suggestion')
          })
        )
        .optional()
        .describe('Suggested related searches')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SerpApiClient({ apiKey: ctx.auth.token, accountId: ctx.auth.accountId });

    let params = searchParams('image_search', ctx.input);

    let data = await client.search(params);

    let imageResults = data.images_results || data.visual_matches || [];
    let images = imageResults.map((r: any) => ({
      position: r.position,
      title: r.title,
      link: r.link,
      source: r.source,
      thumbnailUrl: r.thumbnail,
      originalUrl: r.original,
      originalWidth: r.original_width,
      originalHeight: r.original_height,
      isProduct: r.is_product
    }));

    let suggestedSearches = (data.suggested_searches || []).map((s: any) => ({
      name: s.name,
      link: s.link,
      thumbnailUrl: s.thumbnail
    }));

    return {
      output: {
        ...receiptOutput(data),
        images,
        suggestedSearches
      },
      message: receiptMessage(
        data,
        `Image search returned **${images.length}** results${ctx.input.query ? ` for "${ctx.input.query}"` : ''} using ${ctx.input.engine}.`
      )
    };
  })
  .build();
