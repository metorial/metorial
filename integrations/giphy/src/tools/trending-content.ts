import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { gifSchema, paginationSchema, ratingEnum } from '../lib/types';
import { spec } from '../spec';

export let trendingContent = SlateTool.create(spec, {
  name: 'Trending Content',
  key: 'trending_content',
  description: `Fetch the currently trending GIFs or stickers on GIPHY. The trending feed is continuously updated with the most relevant and engaging content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contentType: z
        .enum(['gifs', 'stickers'])
        .default('gifs')
        .describe('Type of trending content to fetch'),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Number of results to return (1-50, default 25)'),
      offset: z.number().min(0).optional().describe('Results offset for pagination'),
      rating: ratingEnum.describe('Content rating filter (g, pg, pg-13, r)')
    })
  )
  .output(
    z.object({
      results: z.array(gifSchema).describe('Array of trending GIFs or stickers'),
      pagination: paginationSchema.describe('Pagination information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let rating = ctx.input.rating || ctx.config.rating;

    if (ctx.input.contentType === 'stickers') {
      let result = await client.trendingStickers({
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        rating
      });
      return {
        output: {
          results: result.stickers,
          pagination: result.pagination
        },
        message: `Fetched ${result.stickers.length} trending stickers.`
      };
    }

    let result = await client.trendingGifs({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      rating
    });
    return {
      output: {
        results: result.gifs,
        pagination: result.pagination
      },
      message: `Fetched ${result.gifs.length} trending GIFs.`
    };
  })
  .build();
