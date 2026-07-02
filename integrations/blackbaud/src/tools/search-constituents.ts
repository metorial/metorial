import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchConstituents = SlateTool.create(spec, {
  name: 'Search Constituents',
  key: 'search_constituents',
  description: `Search for constituent records by name, email, phone, address, or lookup ID. Supports fuzzy matching (e.g., "Smith" matches "Smyth"). Returns up to 500 results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchText: z
        .string()
        .describe(
          'Text to search for across constituent fields (name, email, phone, address, lookup ID).'
        ),
      limit: z
        .number()
        .optional()
        .describe('Number of records to return (max 500). Default: 500.'),
      offset: z.number().optional().describe('Number of records to skip for pagination.')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of matching constituents.'),
      constituents: z.array(z.any()).describe('Array of matching constituent records.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subscriptionKey: ctx.auth.subscriptionKey
    });

    let result = await client.searchConstituents({
      searchText: ctx.input.searchText,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let constituents = result?.value || [];
    let count = result?.count || 0;

    return {
      output: { count, constituents },
      message: `Found **${count}** constituent(s) matching "${ctx.input.searchText}".`
    };
  })
  .build();
