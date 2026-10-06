import { SlateTool } from 'slates';
import { z } from 'zod';
import { receiptMessage, receiptOutput, SerpApiClient } from '../lib/client';
import { searchMetadataSchema } from '../lib/contracts';
import { searchParams } from '../lib/params';
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
      async: z
        .boolean()
        .optional()
        .describe(
          'Submit asynchronously and return the native search ID/status. Not compatible with noCache or Ludicrous Speed accounts.'
        ),
      noCache: z.boolean().optional().describe('Force fresh results')
    })
  )
  .output(
    z.object({
      isComplete: z
        .boolean()
        .describe(
          'Whether native search status is Success; queued/processing receipts are incomplete.'
        ),
      pagination: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Native pagination metadata; follow native offsets/tokens without inferring a total.'
        ),
      searchMetadata: searchMetadataSchema.optional(),
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
    let client = new SerpApiClient({ apiKey: ctx.auth.token, accountId: ctx.auth.accountId });

    let params = searchParams('autocomplete', ctx.input);

    let data = await client.search(params);

    let suggestions = (data.suggestions || []).map((s: any) => ({
      value: s.value,
      type: s.type
    }));

    return {
      output: {
        ...receiptOutput(data),
        suggestions
      },
      message: receiptMessage(
        data,
        `Autocomplete for "${ctx.input.query}" returned **${suggestions.length}** suggestions.`
      )
    };
  })
  .build();
