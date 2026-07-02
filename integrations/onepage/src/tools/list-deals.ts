import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { dealSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listDeals = SlateTool.create(spec, {
  name: 'List Deals',
  key: 'list_deals',
  description: `List deals in OnePageCRM. Filter by contact, company, or deal status (pending/won/lost). Results are paginated.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().optional().describe('Filter deals by contact ID'),
      companyId: z.string().optional().describe('Filter deals by company ID'),
      status: z.enum(['pending', 'won', 'lost']).optional().describe('Filter by deal status'),
      sortBy: z.string().optional().describe('Field to sort by'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      perPage: z.number().optional().describe('Results per page (max 100, default 10)')
    })
  )
  .output(
    z.object({
      deals: z.array(dealSchema).describe('List of deals'),
      totalCount: z.number().describe('Total number of matching deals'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Results per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.listDeals(ctx.input);

    return {
      output: result,
      message: `Found **${result.totalCount}** deals (page ${result.page}, showing ${result.deals.length}).`
    };
  })
  .build();
