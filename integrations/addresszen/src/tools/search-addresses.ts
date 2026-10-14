import { SlateTool } from 'slates';
import { z } from 'zod';
import { AddressZenClient } from '../lib/client';
import { spec } from '../spec';

let suggestionSchema = z.object({
  suggestion: z.string().describe('Formatted address suggestion text'),
  addressId: z.string().describe('Unique identifier used to resolve the full address'),
  udprn: z
    .number()
    .optional()
    .describe('Unique Delivery Point Reference Number (UK addresses)'),
  umprn: z
    .number()
    .optional()
    .describe('Unique Multiple Residence Point Reference Number (UK addresses)'),
  urls: z
    .record(z.string(), z.string())
    .optional()
    .describe('URLs to resolve the full address in different formats')
});

export let searchAddresses = SlateTool.create(spec, {
  name: 'Search Addresses',
  key: 'search_addresses',
  description: `Search for addresses using an autocomplete query. Returns a list of address suggestions ordered by relevance that can be used to power real-time address finders.
This is step 1 of a two-step process: use this tool to get suggestions, then use **Resolve Address** to get the full address details from a suggestion ID.
Results can be narrowed using postcode filters and dataset restrictions.`,
  instructions: [
    'Use the addressId from the results with the "Resolve Address" tool to retrieve full address details.',
    'The suggestion text format may change over time - do not parse it programmatically.'
  ],
  constraints: [
    'Rate limited to 3,000 requests per 5 minutes.',
    'Autocomplete requests do not consume lookup balance, but resolving suggestions does.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .min(1)
        .max(150)
        .describe('Address search query (partial or full address text)'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .refine(Number.isSafeInteger, 'Limit must be a whole number')
        .optional()
        .describe('Maximum number of suggestions to return (1–100)'),
      postcode: z
        .string()
        .optional()
        .describe('Filter results to a specific postcode (e.g., "sw1a2aa" or "81073")'),
      postcodeOutward: z
        .string()
        .optional()
        .describe('Filter results by outward postcode codes (e.g., "e1,e2,e3")'),
      dataset: z
        .string()
        .optional()
        .describe('Restrict search to a specific dataset within a country'),
      context: z
        .string()
        .optional()
        .describe(
          'ISO alpha-3 country code, such as USA or CAN; discover licensed countries with get_current_key_info'
        ),
      postalCode: z
        .string()
        .optional()
        .describe('Short postal code filter, such as a five-digit US ZIP code'),
      city: z.string().optional().describe('Restrict results to this city'),
      stateCode: z
        .string()
        .optional()
        .describe('Restrict results to this state or region code, such as CA')
    })
  )
  .output(
    z.object({
      suggestions: z
        .array(suggestionSchema)
        .describe('List of address suggestions matching the query'),
      code: z.number().describe('API response code (2000 indicates success)'),
      message: z.string().describe('API response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AddressZenClient(ctx.auth);

    let result = await client.autocompleteAddresses({
      query: ctx.input.query,
      limit: ctx.input.limit,
      postcode: ctx.input.postcode,
      postcodeOutward: ctx.input.postcodeOutward,
      dataset: ctx.input.dataset,
      context: ctx.input.context,
      postalCode: ctx.input.postalCode,
      city: ctx.input.city,
      stateCode: ctx.input.stateCode
    });

    let suggestions = (result.result?.hits || result.result || []).map((hit: any) => ({
      suggestion: hit.suggestion || '',
      addressId: hit.id || hit.udprn?.toString() || '',
      udprn: typeof hit.udprn === 'number' ? hit.udprn : undefined,
      umprn: typeof hit.umprn === 'number' ? hit.umprn : undefined,
      urls: hit.urls ?? undefined
    }));

    return {
      output: {
        suggestions,
        code: result.code || 2000,
        message: result.message || 'Success'
      },
      message: `Found **${suggestions.length}** address suggestion(s) for query "${ctx.input.query}".`
    };
  })
  .build();
