import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchSuggestions = SlateTool.create(spec, {
  name: 'Search Suggestions',
  key: 'search_suggestions',
  description:
    'Get autocomplete suggestions for a web search query without running a geographic search.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().min(1).max(200).describe('Partial search query, up to 200 characters')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      suggestions: z.array(z.string()),
      rawResponse: z.unknown().optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getSearchSuggestions(ctx.input);
    return {
      output: {
        success: result.success,
        suggestions: result.suggestions,
        rawResponse: result
      },
      message: `Found **${result.suggestions.length} search suggestions**.`
    };
  })
  .build();
