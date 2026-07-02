import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listItems = SlateTool.create(spec, {
  name: 'List Items',
  key: 'list_items',
  description: `List inventory items with optional filtering, searching, sorting, and pagination. Returns item summaries including stock levels and pricing.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      perPage: z.number().optional().describe('Number of items per page (max 200)'),
      searchText: z.string().optional().describe('Search items by name or SKU'),
      sortColumn: z
        .enum(['name', 'rate', 'created_time'])
        .optional()
        .describe('Column to sort by'),
      sortOrder: z.enum(['ascending', 'descending']).optional().describe('Sort direction'),
      filterBy: z
        .enum([
          'Status.All',
          'Status.Active',
          'Status.Inactive',
          'Status.Ungrouped',
          'Status.LowStock'
        ])
        .optional()
        .describe('Filter items by status')
    })
  )
  .output(
    z.object({
      items: z.array(
        z.object({
          itemId: z.string().describe('Item ID'),
          name: z.string().describe('Item name'),
          sku: z.string().optional().describe('SKU'),
          rate: z.number().optional().describe('Sales price'),
          purchaseRate: z.number().optional().describe('Purchase price'),
          status: z.string().optional().describe('Item status'),
          stockOnHand: z.number().optional().describe('Stock on hand'),
          unit: z.string().optional().describe('Unit')
        })
      ),
      hasMorePages: z.boolean().describe('Whether more pages are available'),
      totalCount: z.number().optional().describe('Total number of items matching the criteria')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listItems({
      page: ctx.input.page,
      per_page: ctx.input.perPage,
      search_text: ctx.input.searchText,
      sort_column: ctx.input.sortColumn,
      sort_order: ctx.input.sortOrder,
      filter_by: ctx.input.filterBy
    });

    let items = (result.items || []).map((item: any) => ({
      itemId: String(item.item_id),
      name: item.name,
      sku: item.sku ?? undefined,
      rate: item.rate ?? undefined,
      purchaseRate: item.purchase_rate ?? undefined,
      status: item.status ?? undefined,
      stockOnHand: item.stock_on_hand ?? undefined,
      unit: item.unit ?? undefined
    }));

    let pageContext = result.page_context || {};

    return {
      output: {
        items,
        hasMorePages: pageContext.has_more_page ?? false,
        totalCount: pageContext.total ?? undefined
      },
      message: `Found **${items.length}** items${pageContext.total ? ` (${pageContext.total} total)` : ''}.`
    };
  })
  .build();
