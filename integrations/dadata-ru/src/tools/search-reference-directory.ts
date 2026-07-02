import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuggestionsClient } from '../lib/client';
import { spec } from '../spec';

let directorySuggestionSchema = z.object({
  value: z.string().describe('Display value'),
  rawData: z
    .record(z.string(), z.unknown())
    .nullable()
    .describe('Full raw data from the directory entry')
});

export let searchReferenceDirectory = SlateTool.create(spec, {
  name: 'Search Reference Directory',
  key: 'search_reference_directory',
  description: `Searches Russian government and reference directories. Supports autocomplete search or direct lookup by ID across many directory types.
Available directories include: tax offices (FNS), passport offices (FMS), postal offices, metro stations, countries, currencies, OKVED2 (economic activities), OKPD2 (products), OKTMO (municipal territories), customs offices (FTS), courts, and more.`,
  instructions: [
    'Set mode to "suggest" for autocomplete search, or "findById" for direct lookup by identifier.',
    'For suggest: query is the search text. For findById: query is the identifier (code, postal code, etc.).',
    'Use filters to narrow results (e.g., [{"region_code": "77"}] for FNS units in Moscow).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      directory: z
        .enum([
          'fns_unit',
          'fms_unit',
          'postal_unit',
          'metro',
          'country',
          'currency',
          'okved2',
          'okpd2',
          'oktmo',
          'fts_unit',
          'court',
          'mktu'
        ])
        .describe('Directory type to search'),
      mode: z
        .enum(['suggest', 'findById'])
        .default('suggest')
        .describe(
          'Search mode: "suggest" for autocomplete or "findById" for direct ID lookup'
        ),
      query: z.string().describe('Search text (suggest mode) or identifier (findById mode)'),
      count: z.number().optional().describe('Number of results (max 20)'),
      filters: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Filter conditions specific to the directory type')
    })
  )
  .output(
    z.object({
      suggestions: z
        .array(directorySuggestionSchema)
        .describe('Directory entries matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuggestionsClient({
      token: ctx.auth.token,
      secretKey: ctx.auth.secretKey
    });

    let data: any;
    if (ctx.input.mode === 'findById') {
      data = await client.findById(ctx.input.directory, {
        query: ctx.input.query,
        count: ctx.input.count
      });
    } else {
      data = await client.suggestOutward(ctx.input.directory, {
        query: ctx.input.query,
        count: ctx.input.count,
        filters: ctx.input.filters
      });
    }

    let suggestions = (data.suggestions || []).map((s: any) => ({
      value: s.value || '',
      rawData: s.data ?? null
    }));

    return {
      output: { suggestions },
      message: `Found **${suggestions.length}** result(s) in "${ctx.input.directory}" directory for "${ctx.input.query}".`
    };
  })
  .build();
