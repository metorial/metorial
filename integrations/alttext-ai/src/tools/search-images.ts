import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { imageSummarySchema, mapImage } from '../lib/schemas';
import { spec } from '../spec';

export let searchImages = SlateTool.create(spec, {
  name: 'Search Images',
  key: 'search_images',
  description:
    'Search the image library by exact asset ID, URL substring, or alt text. HTTP and HTTPS queries search source URLs; other queries first try an exact asset ID, then fall back to alt-text search.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'Exact asset ID, HTTP or HTTPS URL substring, or alt-text search expression'
        ),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      images: z.array(imageSummarySchema).describe('Image results'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Number of results per page'),
      total: z.number().describe('Total number of matching images'),
      totalPages: z.number().optional().describe('Total result pages'),
      raw: z.record(z.string(), z.unknown()).optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchImages({
      query: ctx.input.query,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let images = result.images.map(mapImage);

    return {
      output: {
        images,
        page: result.page,
        perPage: result.per_page,
        total: result.total,
        totalPages: result.total_pages,
        raw: result.raw
      },
      message: `Found **${result.total}** images matching "${ctx.input.query}" (showing ${images.length} on page ${result.page}).`
    };
  })
  .build();
