import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildFilterParams, flattenResource, validateInput } from '../lib/helpers';
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
      pageOffset: z
        .number()
        .optional()
        .describe('Legacy offset from 0 to 10000; omit to use cursor pagination.'),
      pageAfter: z
        .string()
        .optional()
        .describe('Returned nextPageAfter cursor; keep the same filters and sorting.'),
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
      nextPageOffset: z
        .number()
        .optional()
        .describe('Use as pageOffset for the next page with the same filters.'),
      nextPageAfter: z
        .string()
        .optional()
        .describe('Pass as pageAfter for the next page with unchanged filters.'),
      totalCount: z
        .number()
        .optional()
        .describe('Exact provider count when available and not truncated.')
    })
  )
  .handleInvocation(async ctx => {
    validateInput(ctx.input);
    let client = new Client({ token: ctx.auth.token });

    let filterParams = buildFilterParams({
      'account/id': ctx.input.accountId,
      'owner/id': ctx.input.ownerId,
      name: ctx.input.name
    });

    let params: Record<string, string> = { ...filterParams };
    if (ctx.input.pageSize) params['page[limit]'] = ctx.input.pageSize.toString();
    if (ctx.input.pageAfter !== undefined) params['page[after]'] = ctx.input.pageAfter;
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
        nextPageOffset: result.nextPageOffset,
        nextPageAfter: result.nextPageAfter,
        totalCount: result.totalCount ?? undefined
      },
      message: `Found **${opportunities.length}** opportunities${result.hasMore ? ' (more available)' : ''}.`
    };
  })
  .build();
