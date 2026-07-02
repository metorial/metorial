import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { gifSchema, paginationSchema, ratingEnum } from '../lib/types';
import { spec } from '../spec';

export let searchGifs = SlateTool.create(spec, {
  name: 'Search GIFs & Stickers',
  key: 'search_gifs',
  description: `Search GIPHY's library of millions of GIFs and stickers by keyword or phrase. Supports filtering by content type (GIF or sticker), content rating, and language. Results include multiple image renditions in various sizes and formats.`,
  instructions: [
    'Use specific, descriptive search terms for best results.',
    'Set contentType to "stickers" to search for transparent sticker images instead of GIFs.'
  ],
  constraints: [
    'Maximum 50 results per request (default 25).',
    'Beta API keys are limited to 100 API calls per hour.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query term or phrase'),
      contentType: z
        .enum(['gifs', 'stickers'])
        .default('gifs')
        .describe('Type of content to search for'),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Number of results to return (1-50, default 25)'),
      offset: z.number().min(0).optional().describe('Results offset for pagination'),
      rating: ratingEnum.describe('Content rating filter (g, pg, pg-13, r)'),
      lang: z.string().optional().describe('Language code (ISO 639-1) for regional content')
    })
  )
  .output(
    z.object({
      results: z.array(gifSchema).describe('Array of matching GIFs or stickers'),
      pagination: paginationSchema.describe('Pagination information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let rating = ctx.input.rating || ctx.config.rating;
    let lang = ctx.input.lang || ctx.config.language;

    if (ctx.input.contentType === 'stickers') {
      let result = await client.searchStickers({
        query: ctx.input.query,
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        rating,
        lang
      });
      return {
        output: {
          results: result.stickers,
          pagination: result.pagination
        },
        message: `Found ${result.stickers.length} stickers for "${ctx.input.query}"${result.pagination.totalCount ? ` (${result.pagination.totalCount} total)` : ''}.`
      };
    }

    let result = await client.searchGifs({
      query: ctx.input.query,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      rating,
      lang
    });
    return {
      output: {
        results: result.gifs,
        pagination: result.pagination
      },
      message: `Found ${result.gifs.length} GIFs for "${ctx.input.query}"${result.pagination.totalCount ? ` (${result.pagination.totalCount} total)` : ''}.`
    };
  })
  .build();
