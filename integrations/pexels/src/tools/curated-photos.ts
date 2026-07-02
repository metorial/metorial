import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { paginationSchema, photoSchema } from '../lib/schemas';
import { spec } from '../spec';

export let curatedPhotos = SlateTool.create(spec, {
  name: 'Curated Photos',
  key: 'curated_photos',
  description: `Browse real-time photos curated by the Pexels team. At least one new photo is added per hour, providing a changing selection of trending and featured content. Useful for displaying featured imagery without a specific search query.`,
  constraints: ['Rate limited to 200 requests per hour.', 'Maximum 80 results per page.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number. Default: 1'),
      perPage: z.number().optional().describe('Results per page. Default: 15, Max: 80')
    })
  )
  .output(
    z.object({
      photos: z.array(photoSchema).describe('List of curated photos'),
      pagination: paginationSchema.describe('Pagination information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCuratedPhotos({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    return {
      output: result,
      message: `Retrieved **${result.photos.length}** curated photos (page ${result.pagination.page}).`
    };
  })
  .build();
