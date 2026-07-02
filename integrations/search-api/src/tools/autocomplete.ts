import { SlateTool } from 'slates';
import { z } from 'zod';
import { SearchApiClient } from '../lib/client';
import { spec } from '../spec';

let suggestionSchema = z.object({
  value: z.string().describe('Autocomplete suggestion text'),
  type: z.string().optional().describe('Suggestion type (e.g., "suggestion", "entity")')
});

export let autocomplete = SlateTool.create(spec, {
  name: 'Google Autocomplete',
  key: 'autocomplete',
  description: `Get Google Autocomplete suggestions for a search query. Returns a list of suggested completions that Google would display as a user types. Useful for keyword research, understanding search intent, and discovering popular queries.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Partial search query to get completions for'),
      country: z.string().optional().describe('Country code (e.g., "us")'),
      language: z.string().optional().describe('Interface language code (e.g., "en")')
    })
  )
  .output(
    z.object({
      query: z.string().optional().describe('The input query'),
      suggestions: z.array(suggestionSchema).describe('Autocomplete suggestions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SearchApiClient({ token: ctx.auth.token });

    let data = await client.search({
      engine: 'google_autocomplete',
      q: ctx.input.query,
      gl: ctx.input.country,
      hl: ctx.input.language
    });

    let suggestions = (data.suggestions || []).map((s: any) => ({
      value: s.value || s.query || s,
      type: s.type
    }));

    return {
      output: {
        query: data.search_parameters?.q || ctx.input.query,
        suggestions
      },
      message: `Got ${suggestions.length} autocomplete suggestion${suggestions.length !== 1 ? 's' : ''} for "${ctx.input.query}".`
    };
  })
  .build();
