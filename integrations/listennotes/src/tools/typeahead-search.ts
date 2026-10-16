import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let typeaheadSearch = SlateTool.create(spec, {
  name: 'Typeahead Search',
  key: 'typeahead_search',
  description: `Search-as-you-type suggestions for podcast search. Returns autocomplete term suggestions and optionally matching podcasts and genres.
Omit the query to retrieve trending search terms.`,
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
      raw: z
        .unknown()
        .optional()
        .describe('Original provider response, including unmodified metadata.'),
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
          raw: data,
          terms: data.terms
        },
        message: `Retrieved **${data.terms.length}** trending search terms.`
      };
    }

    let data = await client.typeahead({
      q: ctx.input.query,
      showPodcasts:
        ctx.input.showPodcasts === undefined ? undefined : Number(ctx.input.showPodcasts),
      showGenres:
        ctx.input.showGenres === undefined ? undefined : Number(ctx.input.showGenres),
      safeMode: ctx.input.safeMode === undefined ? undefined : Number(ctx.input.safeMode)
    });

    return {
      output: {
        raw: data,
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
