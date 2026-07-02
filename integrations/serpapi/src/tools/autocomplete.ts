import { SlateTool } from 'slates';
import { z } from 'zod';
import { SerpApiClient } from '../lib/client';
import { spec } from '../spec';

export let autocompleteTool = SlateTool.create(spec, {
  name: 'Autocomplete',
  key: 'autocomplete',
  description: `Get search query suggestions from Google Autocomplete. Returns a list of suggested completions for a partial query. Useful for keyword research, understanding search intent, and building search interfaces.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Partial search query to get suggestions for'),
      language: z.string().optional().describe('Language code (e.g., "en")'),
      country: z.string().optional().describe('Country code (e.g., "us")'),
      noCache: z.boolean().optional().describe('Force fresh results')
    })
  )
  .output(
    z.object({
      suggestions: z
        .array(
          z.object({
            value: z.string().optional().describe('Suggested query text'),
            type: z.string().optional().describe('Suggestion type (e.g., "regular", "entity")')
          })
        )
        .describe('Autocomplete suggestions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SerpApiClient({ apiKey: ctx.auth.token });

    let params: Record<string, any> = {
      engine: 'google_autocomplete',
      q: ctx.input.query
    };

    if (ctx.input.language) params.hl = ctx.input.language;
    if (ctx.input.country) params.gl = ctx.input.country;
    if (ctx.input.noCache) params.no_cache = ctx.input.noCache;

    let data = await client.search(params);

    let suggestions = (data.suggestions || []).map((s: any) => ({
      value: s.value,
      type: s.type
    }));

    return {
      output: {
        suggestions
      },
      message: `Autocomplete for "${ctx.input.query}" returned **${suggestions.length}** suggestions.`
    };
  })
  .build();
