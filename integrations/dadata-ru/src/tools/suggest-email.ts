import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuggestionsClient } from '../lib/client';
import { readSuggestions } from '../lib/response';
import { spec } from '../spec';

export let suggestEmail = SlateTool.create(spec, {
  name: 'Suggest Email',
  key: 'suggest_email',
  description:
    'Autocomplete an email address from a partial local part or domain. Returns the suggested address and its local and domain components.',
  constraints: ['Query limited to 300 characters.', 'Maximum 20 suggestions per request.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().describe('Partial email address, for example anton@'),
      count: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe('Number of suggestions (default 10)')
    })
  )
  .output(
    z.object({
      suggestions: z.array(
        z.object({
          value: z.string().optional().describe('Suggested email address'),
          unrestrictedValue: z.string().optional(),
          local: z.string().nullable().describe('Part before @'),
          domain: z.string().nullable().describe('Part after @')
        })
      ),
      rawData: z.unknown().optional().describe('Complete unmodified provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuggestionsClient(ctx.auth);
    let data = await client.suggestEmail(ctx.input);
    let suggestions = readSuggestions(data).map(s => ({
      value: s.value ?? undefined,
      unrestrictedValue: s.unrestricted_value ?? undefined,
      local: s.data?.local ?? null,
      domain: s.data?.domain ?? null
    }));
    return {
      output: { suggestions, rawData: data },
      message: `Found ${suggestions.length} email suggestion(s).`
    };
  })
  .build();
