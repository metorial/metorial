import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let typeaheadSearch = SlateTool.create(spec, {
  name: 'Typeahead Search',
  key: 'typeahead_search',
  description: `Search-as-you-type suggestions for podcast search. Returns autocomplete term suggestions and optionally matching podcasts and genres.
Also provides access to trending search terms and related search suggestions.`,
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
          'Partial search query for typeahead suggestions. Omit to get trending search terms instead.'
        ),
      showPodcasts: z
        .boolean()
        .optional()
        .describe('Include matching podcasts in suggestions.'),
      showGenres: z.boolean().optional().describe('Include matching genres in suggestions.'),
      safeMode: z.boolean().optional().describe('Exclude explicit content.')
    })
  )
  .output(
    z.object({
      terms: z.array(z.string()).describe('Suggested search terms.'),
      genres: z
        .array(
          z.object({
            genreId: z.number().describe('Genre ID.'),
            name: z.string().describe('Genre name.'),
            parentId: z.number().describe('Parent genre ID.')
          })
        )
        .optional()
        .describe('Matching genres (when showGenres is true).'),
      podcasts: z
        .array(z.any())
        .optional()
        .describe('Matching podcasts (when showPodcasts is true).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    if (!ctx.input.query) {
      let data = await client.getTrendingSearches();
      return {
        output: {
          terms: data.terms
        },
        message: `Retrieved **${data.terms.length}** trending search terms.`
      };
    }

    let data = await client.typeahead({
      q: ctx.input.query,
      showPodcasts: ctx.input.showPodcasts ? 1 : undefined,
      showGenres: ctx.input.showGenres ? 1 : undefined,
      safeMode: ctx.input.safeMode ? 1 : undefined
    });

    return {
      output: {
        terms: data.terms,
        genres: data.genres?.map(g => ({
          genreId: g.id,
          name: g.name,
          parentId: g.parent_id
        })),
        podcasts: data.podcasts
      },
      message: `Found **${data.terms.length}** suggestions for "${ctx.input.query}".`
    };
  })
  .build();
