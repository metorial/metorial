import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { resultArray, SearchApiClient } from '../lib/client';
import { spec } from '../spec';

let suggestionSchema = z.object({
  value: z.string().describe('Autocomplete suggestion text'),
  type: z
    .string()
    .optional()
    .describe('Provider suggestion type code or label, represented as text')
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
      raw: z.unknown().optional().describe('Complete provider response'),
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

    let suggestions = resultArray(data.suggestions, 'suggestions', true).map((s: any) => {
      let value = typeof s === 'string' ? s : (s.value ?? s.query);
      if (typeof value !== 'string') {
        throw createApiServiceError('SearchApi returned a suggestion without text.', {
          reason: 'invalid_response'
        });
      }
      return {
        value,
        type: typeof s === 'string' || s.type === undefined ? undefined : String(s.type)
      };
    });

    return {
      output: {
        raw: data,
        query: data.search_parameters?.q || ctx.input.query,
        suggestions
      },
      message: `Got ${suggestions.length} autocomplete suggestion${suggestions.length !== 1 ? 's' : ''} for "${ctx.input.query}".`
    };
  })
  .build();
