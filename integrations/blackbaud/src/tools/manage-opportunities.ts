import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listOpportunities = SlateTool.create(spec, {
  name: 'List Opportunities',
  key: 'list_opportunities',
  description:
    'List fundraising opportunities with amounts, statuses, constituent IDs, and linked gifts. Filter by constituent, text, dates, or a saved opportunity list.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      constituentId: z
        .string()
        .optional()
        .describe('Filter by one constituent system record ID.'),
      searchText: z.string().optional().describe('Filter text fields on each opportunity.'),
      includeInactive: z.boolean().optional().describe('Include inactive opportunities.'),
      dateAdded: z
        .string()
        .optional()
        .describe('Return opportunities created on or after this ISO 8601 date.'),
      lastModified: z
        .string()
        .optional()
        .describe('Return opportunities modified on or after this ISO 8601 date.'),
      listId: z
        .string()
        .optional()
        .describe(
          'Saved opportunity list ID. Call list_lists with listType Opportunity to discover IDs. Other filters are ignored when this is supplied.'
        ),
      sortToken: z
        .string()
        .optional()
        .describe('Stable pagination token from the previous response nextLink.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(5000)
        .optional()
        .describe('Records per page; default 500, maximum 5000.'),
      offset: z.number().int().min(0).optional().describe('Records to skip for pagination.')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Number of opportunities matching the filters.'),
      opportunities: z.array(z.any()).describe('Opportunity records.'),
      nextLink: z
        .string()
        .optional()
        .describe('Provider URL for the next page, including its pagination token.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let result = await client.listOpportunities(ctx.input);
    let opportunities = result?.value ?? [];
    let count = result?.count ?? opportunities.length;
    return {
      output: { count, opportunities, nextLink: result?.next_link },
      message: `Retrieved **${opportunities.length}** of ${count} opportunity record(s).`
    };
  })
  .build();

export let getOpportunity = SlateTool.create(spec, {
  name: 'Get Opportunity',
  key: 'get_opportunity',
  description:
    'Retrieve a fundraising opportunity by ID, including its amounts, status, assigned fundraisers, and linked gifts.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      opportunityId: z
        .string()
        .describe('Opportunity ID. Call list_opportunities to discover IDs.')
    })
  )
  .output(z.object({ opportunity: z.any().describe('The opportunity record.') }))
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let opportunity = await client.getOpportunity(ctx.input.opportunityId);
    return {
      output: { opportunity },
      message: `Retrieved opportunity **${opportunity?.name ?? ctx.input.opportunityId}**.`
    };
  })
  .build();
