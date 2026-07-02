import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let suggestionSchema = z.object({
  name: z.string().nullable().optional().describe('Suggested value'),
  count: z.number().nullable().optional().describe('Number of records matching this value'),
  meta: z.any().nullable().optional().describe('Additional metadata for the suggestion')
});

export let autocomplete = SlateTool.create(spec, {
  name: 'Autocomplete',
  key: 'autocomplete',
  description: `Get suggestions for search query field values along with the number of available records for each suggestion. Useful for building type-ahead search interfaces or discovering available values for a given field.
Supports fields like company, school, title, region, country, skill, major, and more.`,
  instructions: [
    'Specify the field to autocomplete on and optionally provide a text prefix.',
    'Supported fields include: company, school, title, region, country, locality, skill, major, industry, and more.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      field: z
        .string()
        .describe(
          'Field to autocomplete on (e.g. "company", "school", "title", "skill", "region", "country", "locality", "major", "industry")'
        ),
      text: z
        .string()
        .optional()
        .describe(
          'Text prefix to search for suggestions (e.g. "goog" for companies, "stanf" for schools)'
        ),
      size: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of suggestions to return (1-100, default 10)'),
      titlecase: z.boolean().optional().describe('Titlecase the output fields')
    })
  )
  .output(
    z.object({
      suggestions: z
        .array(suggestionSchema)
        .describe('Autocomplete suggestions with record counts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      sandbox: ctx.config.sandbox
    });

    let result = await client.autocomplete({
      field: ctx.input.field,
      text: ctx.input.text,
      size: ctx.input.size,
      titlecase: ctx.input.titlecase
    });

    let suggestions = (result.data || []).map((item: any) => ({
      name: item.name ?? null,
      count: item.count ?? null,
      meta: item.meta ?? null
    }));

    return {
      output: { suggestions },
      message: `Found **${suggestions.length}** suggestions for field "${ctx.input.field}"${ctx.input.text ? ` matching "${ctx.input.text}"` : ''}.${suggestions.length > 0 ? ` Top result: **${suggestions[0]?.name}** (${suggestions[0]?.count ?? 0} records)` : ''}`
    };
  })
  .build();
