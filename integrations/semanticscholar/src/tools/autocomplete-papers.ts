import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let suggestionSchema = z
  .object({
    paperId: z.string().nullable().optional().describe('Semantic Scholar paper ID'),
    title: z.string().nullable().optional().describe('Paper title')
  })
  .passthrough();

export let autocompletePapers = SlateTool.create(spec, {
  name: 'Autocomplete Papers',
  key: 'autocomplete_papers',
  description: `Get autocomplete suggestions for a partial paper query. Useful for building search interfaces or quickly finding papers by partial title.`,
  constraints: ['Query is limited to 100 characters.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Partial paper title or query string (max 100 characters)')
    })
  )
  .output(
    z.object({
      suggestions: z.array(suggestionSchema).describe('Autocomplete paper suggestions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.autocompletePapers(ctx.input.query);
    let suggestions = result.matches || result.data || [];

    return {
      output: { suggestions },
      message: `Found **${suggestions.length}** autocomplete suggestions for "${ctx.input.query}".`
    };
  })
  .build();
