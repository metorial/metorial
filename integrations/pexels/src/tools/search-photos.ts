import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { paginationSchema, photoSchema } from '../lib/schemas';
import { spec } from '../spec';

export let searchPhotos = SlateTool.create(spec, {
  name: 'Search Photos',
  key: 'search_photos',
  description: `Search the Pexels library for royalty-free stock photos matching a keyword query. Supports filtering by orientation, minimum size, and color. The library is searchable in 28 languages using the locale parameter.`,
  constraints: ['Rate limited to 200 requests per hour.', 'Maximum 80 results per page.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe('The search query (e.g., "ocean", "people working", "autumn leaves")'),
      orientation: z
        .enum(['landscape', 'portrait', 'square'])
        .optional()
        .describe('Desired photo orientation'),
      size: z
        .enum(['large', 'medium', 'small'])
        .optional()
        .describe('Minimum photo size: large (24MP), medium (12MP), or small (4MP)'),
      color: z
        .string()
        .optional()
        .describe(
          'Desired photo color. Supported: red, orange, yellow, green, turquoise, blue, violet, pink, brown, black, gray, white, or a hex color code (e.g., #ffffff)'
        ),
      locale: z
        .string()
        .optional()
        .describe('Locale for the search query (e.g., en-US, de-DE, ja-JP). Default: en-US'),
      page: z.number().optional().describe('Page number. Default: 1'),
      perPage: z.number().optional().describe('Results per page. Default: 15, Max: 80')
    })
  )
  .output(
    z.object({
      photos: z.array(photoSchema).describe('List of matching photos'),
      pagination: paginationSchema.describe('Pagination information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchPhotos({
      query: ctx.input.query,
      orientation: ctx.input.orientation,
      size: ctx.input.size,
      color: ctx.input.color,
      locale: ctx.input.locale,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    return {
      output: result,
      message: `Found **${result.pagination.totalResults}** photos for "${ctx.input.query}" (page ${result.pagination.page}, showing ${result.photos.length} results).`
    };
  })
  .build();
