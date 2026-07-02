import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { mapPropertyOutput, propertyOutputSchema } from './search-properties';

export let findSimilarProperties = SlateTool.create(spec, {
  name: 'Find Similar Properties',
  key: 'find_similar_properties',
  description: `Find properties similar to a given property. Useful for market comparison, valuation, and discovering comparable listings in the same area.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      propertyId: z.string().describe('UUID of the property to find similar listings for'),
      fromDate: z
        .string()
        .optional()
        .describe('Only return similar properties listed after this date (ISO 8601)'),
      sortBy: z
        .enum(['createdAt', 'updatedAt', 'price', 'surface', 'pricePerMeter'])
        .optional()
        .describe('Field to sort by'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      itemsPerPage: z.number().optional().describe('Results per page (max 30)')
    })
  )
  .output(
    z.object({
      totalItems: z.number().describe('Total number of similar properties found'),
      properties: z.array(propertyOutputSchema).describe('List of similar properties'),
      hasNextPage: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let params: Record<string, unknown> = {};
    if (ctx.input.fromDate) params.fromDate = ctx.input.fromDate;
    if (ctx.input.page !== undefined) params.page = ctx.input.page;
    if (ctx.input.itemsPerPage !== undefined) params.itemsPerPage = ctx.input.itemsPerPage;
    if (ctx.input.sortBy && ctx.input.sortDirection) {
      params[`order[${ctx.input.sortBy}]`] = ctx.input.sortDirection;
    }

    let result = await client.getSimilarProperties(ctx.input.propertyId, params);
    let properties = (result['hydra:member'] ?? []).map(mapPropertyOutput);
    let hasNextPage = !!result['hydra:view']?.['hydra:next'];

    return {
      output: {
        totalItems: result['hydra:totalItems'],
        properties,
        hasNextPage
      },
      message: `Found **${result['hydra:totalItems']}** properties similar to property \`${ctx.input.propertyId}\`. Returned **${properties.length}** results.`
    };
  })
  .build();
