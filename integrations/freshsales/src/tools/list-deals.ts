import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listDeals = SlateTool.create(spec, {
  name: 'List Deals',
  key: 'list_deals',
  description: `List deals from a saved view in Freshsales. Use the **listFilters** tool to get available view IDs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      viewId: z.number().describe('View ID to list deals from'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      sort: z.string().optional().describe('Field to sort by'),
      sortType: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      deals: z.array(
        z.object({
          dealId: z.number(),
          name: z.string().nullable().optional(),
          amount: z.number().nullable().optional(),
          expectedClose: z.string().nullable().optional(),
          dealStageId: z.number().nullable().optional(),
          ownerId: z.number().nullable().optional(),
          createdAt: z.string().nullable().optional(),
          updatedAt: z.string().nullable().optional()
        })
      ),
      total: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listDeals(ctx.input.viewId, {
      page: ctx.input.page,
      sort: ctx.input.sort,
      sortType: ctx.input.sortType
    });

    let deals = result.deals.map((d: Record<string, any>) => ({
      dealId: d.id,
      name: d.name,
      amount: d.amount,
      expectedClose: d.expected_close,
      dealStageId: d.deal_stage_id,
      ownerId: d.owner_id,
      createdAt: d.created_at,
      updatedAt: d.updated_at
    }));

    return {
      output: {
        deals,
        total: result.meta?.total
      },
      message: `Found **${deals.length}** deals (total: ${result.meta?.total ?? 'unknown'}).`
    };
  })
  .build();
