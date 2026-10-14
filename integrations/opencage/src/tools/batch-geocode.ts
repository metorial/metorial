import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { type MappedGeocodeResult, mapGeocodeResult } from '../lib/mappers';
import { geocodeResultSchema } from '../lib/schemas';
import { spec } from '../spec';

export let batchGeocode = SlateTool.create(spec, {
  name: 'Batch Geocode',
  key: 'batch_geocode',
  description:
    'Geocode up to ten addresses or place names in one tool call, preserving the order and query for each result. Each location uses a separate OpenCage API request.',
  instructions: [
    'Provide complete addresses or place names rather than partial autocomplete text.',
    'Requests run sequentially with at least one second between them.',
    'If a provider request fails, the batch stops; completed requests still count toward your quota.'
  ],
  constraints: [
    'Accepts one to ten queries.',
    'Each query counts separately toward your API quota.',
    'Other concurrent tool calls using the same key can still exceed account rate limits.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      queries: z
        .array(z.string().trim().min(2))
        .min(1)
        .max(10)
        .describe('Addresses or place names to geocode, in the desired output order'),
      countrycode: z
        .string()
        .optional()
        .describe('Restrict all queries to comma-separated ISO 3166-1 Alpha 2 country codes'),
      language: z.string().optional().describe('Preferred IETF language tag, or native'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .refine(Number.isInteger, 'The result limit must be a whole number')
        .optional()
        .describe('Maximum results per query (default: 10, maximum: 100)'),
      noAnnotations: z.boolean().optional().describe('Omit location annotations'),
      noRecord: z.boolean().optional().describe('Prevent logging of query contents')
    })
  )
  .output(
    z.object({
      queriesProcessed: z.number(),
      items: z.array(
        z.object({
          query: z.string(),
          totalResults: z.number(),
          results: z.array(geocodeResultSchema)
        })
      ),
      rateLimit: z.number().optional(),
      rateRemaining: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let items: { query: string; totalResults: number; results: MappedGeocodeResult[] }[] = [];
    let rateLimit: number | undefined;
    let rateRemaining: number | undefined;

    for (let query of ctx.input.queries) {
      if (items.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 1_100));
      }

      let response = await client.forwardGeocode({
        query,
        countrycode: ctx.input.countrycode,
        language: ctx.input.language,
        limit: ctx.input.limit,
        noAnnotations: ctx.input.noAnnotations,
        noRecord: ctx.input.noRecord
      });

      items.push({
        query,
        totalResults: response.total_results,
        results: response.results.map(mapGeocodeResult)
      });
      rateLimit = response.rate?.limit;
      rateRemaining = response.rate?.remaining;
    }

    return {
      output: { queriesProcessed: items.length, items, rateLimit, rateRemaining },
      message: `Geocoded ${items.length} location queries.`
    };
  })
  .build();
