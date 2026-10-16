import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuggestionsClient } from '../lib/client';
import { readSuggestions } from '../lib/response';
import { spec } from '../spec';

export let suggestName = SlateTool.create(spec, {
  name: 'Suggest Personal Name',
  key: 'suggest_name',
  description:
    'Autocomplete Russian personal names, surnames, and patronymics, with optional gender and name-part filters.',
  constraints: ['Query limited to 300 characters.', 'Maximum 20 suggestions per request.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().describe('Full or partial personal name'),
      count: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe('Number of suggestions (default 10)'),
      gender: z.enum(['UNKNOWN', 'MALE', 'FEMALE']).optional().describe('Filter by gender'),
      parts: z
        .array(z.enum(['SURNAME', 'NAME', 'PATRONYMIC']))
        .optional()
        .describe('Name parts to complete')
    })
  )
  .output(
    z.object({
      suggestions: z.array(
        z.object({
          value: z.string().optional().describe('Suggested name'),
          unrestrictedValue: z.string().optional().describe('Full suggested name'),
          surname: z.string().nullable(),
          name: z.string().nullable(),
          patronymic: z.string().nullable(),
          gender: z.string().nullable(),
          qualityCode: z.string().nullable().describe('Provider name completeness code')
        })
      ),
      rawData: z.unknown().optional().describe('Complete unmodified provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuggestionsClient(ctx.auth);
    let data = await client.suggestName(ctx.input);
    let suggestions = readSuggestions(data).map(s => ({
      value: s.value ?? undefined,
      unrestrictedValue: s.unrestricted_value ?? undefined,
      surname: s.data?.surname ?? null,
      name: s.data?.name ?? null,
      patronymic: s.data?.patronymic ?? null,
      gender: s.data?.gender ?? null,
      qualityCode: s.data?.qc != null ? String(s.data.qc) : null
    }));
    return {
      output: { suggestions, rawData: data },
      message: `Found ${suggestions.length} personal name suggestion(s).`
    };
  })
  .build();
