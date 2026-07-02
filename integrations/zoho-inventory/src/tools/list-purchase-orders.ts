import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listPurchaseOrders = SlateTool.create(spec, {
  name: 'List Purchase Orders',
  key: 'list_purchase_orders',
  description: `List purchase orders with optional filtering by vendor, status, search text, and pagination. Returns PO summaries including status and totals.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Number per page (max 200)'),
      vendorId: z.string().optional().describe('Filter by vendor ID'),
      searchText: z.string().optional().describe('Search by PO number or reference'),
      filterBy: z
        .enum([
          'Status.All',
          'Status.Draft',
          'Status.Issued',
          'Status.Open',
          'Status.Cancelled',
          'Status.Closed',
          'Status.OverDue'
        ])
        .optional()
        .describe('Filter by PO status'),
      sortColumn: z
        .enum(['purchaseorder_number', 'vendor_name', 'date', 'total', 'created_time'])
        .optional(),
      sortOrder: z.enum(['ascending', 'descending']).optional()
    })
  )
  .output(
    z.object({
      purchaseOrders: z.array(
        z.object({
          purchaseOrderId: z.string().describe('Purchase order ID'),
          purchaseorderNumber: z.string().optional().describe('PO number'),
          vendorName: z.string().optional().describe('Vendor name'),
          status: z.string().optional().describe('PO status'),
          total: z.number().optional().describe('Total amount'),
          date: z.string().optional().describe('PO date')
        })
      ),
      hasMorePages: z.boolean().describe('Whether more pages exist'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listPurchaseOrders({
      page: ctx.input.page,
      per_page: ctx.input.perPage,
      vendor_id: ctx.input.vendorId,
      search_text: ctx.input.searchText,
      filter_by: ctx.input.filterBy,
      sort_column: ctx.input.sortColumn,
      sort_order: ctx.input.sortOrder
    });

    let purchaseOrders = (result.purchaseorders || []).map((po: any) => ({
      purchaseOrderId: String(po.purchaseorder_id),
      purchaseorderNumber: po.purchaseorder_number ?? undefined,
      vendorName: po.vendor_name ?? undefined,
      status: po.status ?? undefined,
      total: po.total ?? undefined,
      date: po.date ?? undefined
    }));

    let pageContext = result.page_context || {};

    return {
      output: {
        purchaseOrders,
        hasMorePages: pageContext.has_more_page ?? false,
        totalCount: pageContext.total ?? undefined
      },
      message: `Found **${purchaseOrders.length}** purchase orders${pageContext.total ? ` (${pageContext.total} total)` : ''}.`
    };
  })
  .build();
