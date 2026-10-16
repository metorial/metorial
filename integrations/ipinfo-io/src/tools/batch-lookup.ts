import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let batchLookup = SlateTool.create(spec, {
  name: 'Batch Lookup',
  key: 'batch_lookup',
  description: `Look up multiple IP addresses or mixed query patterns in a single request. Supports mixing different API tiers and specific fields. Each query can target a different endpoint or field (e.g. "lite/8.8.8.8", "8.8.8.8/country", "AS15169").`,
  instructions: [
    'Each query is a URL pattern such as "8.8.8.8", "lite/8.8.8.8", "8.8.8.8/country", or "AS15169". Bare IP addresses use the API selected by the optional api input.',
    'Free-tier tokens should select api="lite" for country, continent, and ASN lookups.',
    'Results are returned as a map with each query as the key and the corresponding API response as the value.'
  ],
  constraints: [
    'Maximum 1,000 queries per batch request.',
    'Each query within the batch counts as a separate request for billing purposes.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      queries: z
        .array(z.string())
        .describe('List of IP addresses or URL patterns to look up (max 1000)'),
      api: z
        .enum(['lookup', 'lite', 'legacy'])
        .optional()
        .describe(
          'Default API for bare IP queries: current paid lookup, free Lite, or legacy. Omit for lookup.'
        ),
      filter: z
        .boolean()
        .optional()
        .describe('When true, omit queries that have no response from the result map')
    })
  )
  .output(
    z.object({
      results: z
        .record(z.string(), z.any())
        .describe('Map of query strings to their API responses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let results = await client.batchLookup(ctx.input.queries, {
      api: ctx.input.api,
      filter: ctx.input.filter
    });

    let resultCount = Object.keys(results).length;

    return {
      output: {
        results
      },
      message: `Batch lookup completed: **${resultCount}** result(s) returned for ${ctx.input.queries.length} quer${ctx.input.queries.length === 1 ? 'y' : 'ies'}.`
    };
  })
  .build();
