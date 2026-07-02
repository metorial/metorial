import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildFilterParams, flattenResource } from '../lib/helpers';
import { spec } from '../spec';

export let listOpportunities = SlateTool.create(spec, {
  name: 'List Opportunities',
  key: 'list_opportunities',
  description: `List sales opportunities from Outreach. Filter by account, owner, or stage. Returns paginated results with deal details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z.string().optional().describe('Filter by account ID'),
      ownerId: z.string().optional().describe('Filter by owner user ID'),
      name: z.string().optional().describe('Filter by opportunity name'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageOffset: z.number().optional().describe('Page offset for pagination'),
      sortBy: z.string().optional().describe('Sort field (e.g. "closeDate", "-amount")')
    })
  )
  .output(
    z.object({
      opportunities: z.array(
        z.object({
          opportunityId: z.string(),
          name: z.string().optional(),
          amount: z.number().optional(),
          probability: z.number().optional(),
          closeDate: z.string().optional(),
          stageName: z.string().optional(),
          accountId: z.string().optional(),
          ownerId: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      hasMore: z.boolean(),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let filterParams = buildFilterParams({
      'account/id': ctx.input.accountId,
      'owner/id': ctx.input.ownerId,
      name: ctx.input.name
    });

    let params: Record<string, string> = { ...filterParams };
    if (ctx.input.pageSize) params['page[size]'] = ctx.input.pageSize.toString();
    if (ctx.input.pageOffset !== undefined)
      params['page[offset]'] = ctx.input.pageOffset.toString();
    if (ctx.input.sortBy) params.sort = ctx.input.sortBy;

    let result = await client.listOpportunities(params);

    let opportunities = result.records.map(r => {
      let flat = flattenResource(r);
      return {
        opportunityId: flat.id,
        name: flat.name,
        amount: flat.amount,
        probability: flat.probability,
        closeDate: flat.closeDate,
        stageName: flat.stageName,
        accountId: flat.accountId,
        ownerId: flat.ownerId,
        updatedAt: flat.updatedAt
      };
    });

    return {
      output: {
        opportunities,
        hasMore: result.hasMore,
        totalCount: result.totalCount ?? undefined
      },
      message: `Found **${opportunities.length}** opportunities${result.hasMore ? ' (more available)' : ''}.`
    };
  })
  .build();
