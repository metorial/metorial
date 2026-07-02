import { SlateTool } from 'slates';
import { z } from 'zod';
import { freshsalesServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let searchRecords = SlateTool.create(spec, {
  name: 'Search Records',
  key: 'search_records',
  description: `Search across Freshsales entities (contacts, accounts, deals, users, and custom modules) using keywords or field-specific lookup.
Use **keyword** for general search or **lookupField** + **lookupValue** for precise field-based lookups.`,
  instructions: [
    'For general keyword search, provide "keyword" and optionally "entities" to filter by type.',
    'For field-specific lookup (e.g. searching by email), provide "lookupValue", "lookupField", and "lookupEntity".'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z.string().optional().describe('Search keyword for general search'),
      entities: z
        .string()
        .optional()
        .describe(
          'Comma-separated entity types to search, e.g. "contact", "sales_account", "deal", or "user"'
        ),
      lookupValue: z
        .string()
        .optional()
        .describe('Value to look up (for field-specific search)'),
      lookupField: z.string().optional().describe('Field to search in (e.g. "email", "name")'),
      lookupEntity: z
        .string()
        .optional()
        .describe('Entity type for lookup (e.g. "contact", "lead")')
    })
  )
  .output(
    z.object({
      results: z.array(z.record(z.string(), z.any())).describe('Search results')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let results: Record<string, any>[];

    let hasAnyLookupInput =
      ctx.input.lookupValue || ctx.input.lookupField || ctx.input.lookupEntity;

    if (ctx.input.lookupValue && ctx.input.lookupField && ctx.input.lookupEntity) {
      results = await client.lookup(
        ctx.input.lookupValue,
        ctx.input.lookupField,
        ctx.input.lookupEntity
      );
    } else if (hasAnyLookupInput) {
      throw freshsalesServiceError(
        'lookupValue, lookupField, and lookupEntity are all required for lookup search.'
      );
    } else if (ctx.input.keyword) {
      results = await client.search(ctx.input.keyword, ctx.input.entities);
    } else {
      throw freshsalesServiceError(
        'Provide either keyword, or lookupValue with lookupField and lookupEntity.'
      );
    }

    return {
      output: { results },
      message: `Found **${results.length}** results.`
    };
  })
  .build();
