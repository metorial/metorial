import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getGenresAndRegions = SlateTool.create(spec, {
  name: 'Get Genres & Regions',
  key: 'get_genres_and_regions',
  description: `Fetch the directory of podcast genres, supported languages, and supported regions. Use this to discover valid genre IDs, language names, and region codes for filtering search and discovery results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      include: z
        .enum(['genres', 'languages', 'regions', 'all'])
        .optional()
        .describe('What to include in the response. Defaults to "all".'),
      topLevelGenresOnly: z
        .boolean()
        .optional()
        .describe('When fetching genres, only return top-level genres (no sub-genres).')
    })
  )
  .output(
    z.object({
      genres: z
        .array(
          z.object({
            genreId: z.number().describe('Genre ID for use in search and discovery filters.'),
            name: z.string().describe('Genre name.'),
            parentId: z.number().describe('Parent genre ID. 0 for top-level genres.')
          })
        )
        .optional()
        .describe('Available podcast genres.'),
      languages: z.array(z.string()).optional().describe('Supported languages for filtering.'),
      regions: z
        .record(z.string(), z.string())
        .optional()
        .describe('Supported regions as a map of country code to country name.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let include = ctx.input.include || 'all';

    let genres: { genreId: number; name: string; parentId: number }[] | undefined;
    let languages: string[] | undefined;
    let regions: Record<string, string> | undefined;

    if (include === 'all' || include === 'genres') {
      let data = await client.getGenres(ctx.input.topLevelGenresOnly ? 1 : undefined);
      genres = data.genres.map(g => ({
        genreId: g.id,
        name: g.name,
        parentId: g.parent_id
      }));
    }

    if (include === 'all' || include === 'languages') {
      let data = await client.getLanguages();
      languages = data.languages;
    }

    if (include === 'all' || include === 'regions') {
      let data = await client.getRegions();
      regions = data.regions;
    }

    let parts: string[] = [];
    if (genres) parts.push(`${genres.length} genres`);
    if (languages) parts.push(`${languages.length} languages`);
    if (regions) parts.push(`${Object.keys(regions).length} regions`);

    return {
      output: {
        genres,
        languages,
        regions
      },
      message: `Fetched ${parts.join(', ')}.`
    };
  })
  .build();
