import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let trendingSearches = SlateTool.create(spec, {
  name: 'Trending Searches',
  key: 'trending_searches',
  description:
    'Retrieve current Google Trending now searches for a country, including provider search volume, related queries, categories, and notices when available.',
  instructions: [
    'This endpoint returns current trending searches. Historical interest-over-time and keyword comparison reports are unavailable.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      country: z
        .string()
        .optional()
        .describe('Country code (geo), for example US; defaults to the provider country'),
      language: z.string().optional().describe('Interface language (hl), for example en'),
      category: z.string().optional().describe('Google Trends category ID (cat)')
    })
  )
  .output(z.record(z.string(), z.any()))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let results = await client.getTrendingSearches({
      country: ctx.input.country,
      hl: ctx.input.language,
      category: ctx.input.category
    });
    return {
      output: results,
      message: `Retrieved current trending searches${ctx.input.country ? ` for ${ctx.input.country}` : ''}.`
    };
  })
  .build();
