import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshBooksClient } from '../lib/client';
import { spec } from '../spec';

export let listItems = SlateTool.create(spec, {
  name: 'List Items',
  key: 'list_items',
  description: `List billable items in FreshBooks. Returns reusable product/service records with names, descriptions, and rates.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      items: z.array(
        z.object({
          itemId: z.number(),
          name: z.string().nullable().optional(),
          description: z.string().nullable().optional(),
          unitCost: z.any().optional(),
          inventory: z.string().nullable().optional(),
          sku: z.string().nullable().optional()
        })
      ),
      totalCount: z.number(),
      currentPage: z.number(),
      totalPages: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshBooksClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      businessId: ctx.config.businessId
    });

    let params: Record<string, string | number> = {};
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.perPage) params.per_page = ctx.input.perPage;

    let result = await client.listItems(params);

    let items = (result.items || []).map((i: any) => ({
      itemId: i.id || i.itemid,
      name: i.name,
      description: i.description,
      unitCost: i.unit_cost,
      inventory: i.inventory,
      sku: i.sku
    }));

    return {
      output: {
        items,
        totalCount: result.total || items.length,
        currentPage: result.page || 1,
        totalPages: result.pages || 1
      },
      message: `Found **${result.total || items.length}** items.`
    };
  })
  .build();
