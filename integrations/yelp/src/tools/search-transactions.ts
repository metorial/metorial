import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapYelpOutput } from '../lib/response';
import { spec } from '../spec';
import { businessSchema, mapBusiness } from './search-businesses';

let outputSchema = z.object({
  total: z.number().describe('Total number of matching businesses'),
  businesses: z.array(businessSchema).describe('Businesses supporting the transaction type')
});

export let searchTransactions = SlateTool.create(spec, {
  name: 'Search by Transaction',
  key: 'search_transactions',
  description: `Search for businesses that support specific transaction types, such as food delivery or pickup. Currently supports "delivery" for food delivery businesses in the US.`,
  constraints: [
    'Currently only the "delivery" transaction type is supported.',
    'Requires either a location or latitude/longitude coordinates.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      transactionType: z.enum(['delivery']).describe('Transaction type to search for'),
      location: z
        .string()
        .optional()
        .describe(
          'Address, city, state, or zip code. Required if latitude/longitude not provided.'
        ),
      latitude: z
        .number()
        .optional()
        .describe('Latitude coordinate. Required if location not provided.'),
      longitude: z
        .number()
        .optional()
        .describe('Longitude coordinate. Required if location not provided.'),
      term: z.string().optional().describe('Search keyword or business name'),
      categories: z
        .string()
        .optional()
        .describe(
          'Comma-delimited category aliases; call list_categories to discover aliases'
        ),
      price: z.string().optional().describe('Comma-delimited price levels from 1 to 4')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchTransactions(ctx.input.transactionType, {
      location: ctx.input.location,
      latitude: ctx.input.latitude,
      longitude: ctx.input.longitude,
      term: ctx.input.term,
      categories: ctx.input.categories,
      price: ctx.input.price
    });

    return mapYelpOutput(outputSchema, () => {
      let businesses = result.businesses.map(mapBusiness);

      return {
        output: {
          total: result.total,
          businesses
        },
        message: `Found **${result.total}** businesses supporting ${ctx.input.transactionType}${ctx.input.location ? ` near ${ctx.input.location}` : ''}. Returned ${businesses.length} results.`
      };
    });
  })
  .build();
