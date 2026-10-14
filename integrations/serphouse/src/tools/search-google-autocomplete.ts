import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchGoogleAutocomplete = SlateTool.create(spec, {
  name: 'Search Google Autocomplete',
  key: 'search_google_autocomplete',
  description:
    'Retrieve real-time Google search suggestions for a query, with optional language, location, and client targeting. Useful for keyword discovery and content research.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().min(1).describe('Search phrase to get suggestions for'),
      lang: z.string().optional().describe('Language code from list_languages'),
      loc: z.string().optional().describe('Location name from search_locations'),
      client: z
        .enum(['chrome', 'chrome-omni', 'home_page', 'safari', 'firefox', 'youtube'])
        .optional()
        .describe('Autocomplete client; the provider defaults to chrome')
    })
  )
  .output(
    z.object({
      status: z.string(),
      message: z.string(),
      searchMetadata: z.any().optional(),
      searchParameters: z.any().optional(),
      suggestions: z.array(z.any()).describe('Keyword suggestions with relevance and links'),
      verbatimRelevance: z.number().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let response = await new Client(ctx.auth.token).googleAutocompleteSearch({
      q: ctx.input.query,
      ...pickDefined({
        lang: ctx.input.lang,
        loc: ctx.input.loc,
        client: ctx.input.client
      })
    });
    let resultsData = response?.results;
    let suggestions = resultsData?.results?.suggestions ?? [];

    return {
      output: {
        status: response?.status ?? 'unknown',
        message: response?.msg ?? '',
        searchMetadata: resultsData?.search_metadata,
        searchParameters: resultsData?.search_parameters,
        suggestions,
        verbatimRelevance: resultsData?.results?.verbatim_relevance
      },
      message: `Retrieved **${suggestions.length}** autocomplete suggestions for **"${ctx.input.query}"**.`
    };
  })
  .build();
