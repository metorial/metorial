import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let imageResultSchema = z
  .object({
    position: z.number().optional().describe('Position in results'),
    sourceUrl: z.string().optional().describe('URL of the source page'),
    title: z.string().optional().describe('Image title'),
    imageUrl: z.string().optional().describe('Direct URL to the image'),
    thumbnailUrl: z.string().optional().describe('URL to the thumbnail'),
    width: z.number().optional().describe('Image width in pixels'),
    height: z.number().optional().describe('Image height in pixels')
  })
  .passthrough();

let imageSearchResultSchema = z
  .object({
    query: z.record(z.string(), z.any()).optional().describe('Echo of query parameters'),
    imageResults: z.array(imageResultSchema).optional().describe('Image search results')
  })
  .passthrough();

export let imageSearch = SlateTool.create(spec, {
  name: 'Image Search',
  key: 'image_search',
  description: `Search Google Images and retrieve structured image results with thumbnails, source URLs, and dimensions. Supports filtering by size, color, type, and date. Pagination enables retrieval of up to 300 results per query.`,
  instructions: [
    'Set `filterSize` to filter by image dimensions: "m" (medium), "l" (large), "i" (icon).',
    'Set `filterColor` to filter by color: "color", "gray", "trans" (transparent), or specific colors like "red", "blue", etc.',
    'Set `filterType` to filter by image type: "clipart", "lineart", "gif".',
    'Use `start` for pagination to retrieve additional results beyond the first page.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Image search query string'),
      location: z.string().optional().describe('Location for geotargeted results'),
      language: z.string().optional().describe('Language code (hl), e.g. "en"'),
      country: z.string().optional().describe('Country code (gl), e.g. "us"'),
      numResults: z
        .number()
        .optional()
        .describe('Number of results to return (max 100 per page)'),
      start: z.number().optional().describe('Result offset for pagination'),
      filterSize: z
        .enum(['m', 'l', 'i'])
        .optional()
        .describe('Filter by image size: m=medium, l=large, i=icon'),
      filterColor: z
        .string()
        .optional()
        .describe(
          'Filter by color: "color", "gray", "trans", or a specific color like "red", "blue"'
        ),
      filterType: z
        .enum(['clipart', 'lineart', 'gif'])
        .optional()
        .describe('Filter by image type'),
      filterTime: z
        .enum(['d', 'w', 'm', 'y'])
        .optional()
        .describe('Filter by time: d=day, w=week, m=month, y=year')
    })
  )
  .output(imageSearchResultSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let tbsFilters: string[] = [];
    if (ctx.input.filterSize) tbsFilters.push(`isz:${ctx.input.filterSize}`);
    if (ctx.input.filterColor) tbsFilters.push(`ic:${ctx.input.filterColor}`);
    if (ctx.input.filterType) tbsFilters.push(`itp:${ctx.input.filterType}`);
    if (ctx.input.filterTime) tbsFilters.push(`qdr:${ctx.input.filterTime}`);

    let results = await client.search({
      q: ctx.input.query,
      tbm: 'isch',
      location: ctx.input.location,
      hl: ctx.input.language,
      gl: ctx.input.country,
      num: ctx.input.numResults,
      start: ctx.input.start,
      tbs: tbsFilters.length > 0 ? tbsFilters.join(',') : undefined
    });

    let imageResults = results.image_results ?? results.images ?? [];

    return {
      output: {
        ...results,
        imageResults
      },
      message: `Found **${imageResults.length}** image results for "${ctx.input.query}".`
    };
  })
  .build();
