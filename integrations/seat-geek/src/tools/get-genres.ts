import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getGenres = SlateTool.create(spec, {
  name: 'Get Genres',
  key: 'get_genres',
  description:
    'List available SeatGeek music genres. Use the returned genre slugs with genreSlug or primaryGenreSlug in Search Performers.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number, starting at 1'),
      perPage: z.number().optional().describe('Number of genre records per page')
    })
  )
  .output(
    z.object({
      genres: z
        .array(z.unknown())
        .describe(
          'Original SeatGeek genre records, including the slugs used to filter performers'
        ),
      raw: z.unknown().optional().describe('Original provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ ...ctx.auth, ...ctx.config });
    let response = await client.getGenres({
      ...(ctx.input.page === undefined ? {} : { page: String(ctx.input.page) }),
      ...(ctx.input.perPage === undefined ? {} : { per_page: String(ctx.input.perPage) })
    });
    return {
      output: { genres: response.genres, raw: response },
      message: `Retrieved ${response.genres.length} SeatGeek music genres.`
    };
  })
  .build();
