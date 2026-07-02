import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOpportunity = SlateTool.create(spec, {
  name: 'Get Opportunity',
  key: 'get_opportunity',
  description: `Retrieve one or more sales opportunity records from ForceManager.
Fetch by ID or list/search opportunities with filtering by account, status, sales rep, or custom queries.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      opportunityId: z.number().optional().describe('Specific opportunity ID to retrieve'),
      query: z.string().optional().describe('ForceManager query language filter'),
      accountId: z.number().optional().describe('Filter by primary account ID'),
      salesRepId: z.number().optional().describe('Filter by sales rep ID'),
      reference: z.string().optional().describe('Search by reference (LIKE match)'),
      page: z.number().optional().describe('Page number (0-indexed)')
    })
  )
  .output(
    z.object({
      opportunities: z.array(z.any()).describe('List of matching opportunity records'),
      totalCount: z.number().describe('Number of records returned'),
      nextPage: z.number().nullable().describe('Next page number, or null if no more pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (ctx.input.opportunityId) {
      let opportunity = await client.getOpportunity(ctx.input.opportunityId);
      return {
        output: { opportunities: [opportunity], totalCount: 1, nextPage: null },
        message: `Retrieved opportunity **${opportunity?.reference || ctx.input.opportunityId}**`
      };
    }

    let params: Record<string, any> = {};
    if (ctx.input.query) params.q = ctx.input.query;
    if (ctx.input.accountId) params.accountId1 = ctx.input.accountId;
    if (ctx.input.salesRepId) params.salesRepId = ctx.input.salesRepId;
    if (ctx.input.reference) params.reference = ctx.input.reference;

    let result = await client.listOpportunities(params, ctx.input.page);

    return {
      output: {
        opportunities: result.records,
        totalCount: result.entityCount,
        nextPage: result.nextPage
      },
      message: `Found **${result.entityCount}** opportunity/opportunities${result.nextPage !== null ? ` (more pages available)` : ''}`
    };
  })
  .build();
