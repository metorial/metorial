import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { gifSchema, paginationSchema } from '../lib/types';
import { spec } from '../spec';

export let getGifs = SlateTool.create(spec, {
  name: 'Get GIFs by ID',
  key: 'get_gifs',
  description: `Retrieve one or more specific GIFs by their GIPHY IDs. Provide a single ID or an array of up to 100 IDs to fetch GIF details including all renditions and metadata.`,
  constraints: ['Maximum 100 IDs per request when fetching multiple GIFs.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      gifIds: z
        .array(z.string())
        .min(1)
        .max(100)
        .describe('Array of GIPHY GIF IDs to retrieve (1-100)')
    })
  )
  .output(
    z.object({
      results: z.array(gifSchema).describe('Array of retrieved GIFs'),
      pagination: paginationSchema
        .optional()
        .describe('Pagination information (for multi-ID requests)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.gifIds.length === 1) {
      let result = await client.getGifById(ctx.input.gifIds[0]!);
      return {
        output: {
          results: [result.gif]
        },
        message: `Retrieved GIF: **${result.gif.title || result.gif.gifId}**`
      };
    }

    let result = await client.getGifsByIds(ctx.input.gifIds);
    return {
      output: {
        results: result.gifs,
        pagination: result.pagination
      },
      message: `Retrieved ${result.gifs.length} GIFs.`
    };
  })
  .build();
