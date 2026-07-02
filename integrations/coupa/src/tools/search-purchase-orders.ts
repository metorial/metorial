import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoupaClient } from '../lib/client';
import { spec } from '../spec';

let purchaseOrderSchema = z.object({
  purchaseOrderId: z.number().describe('Coupa internal purchase order ID'),
  poNumber: z.string().nullable().optional().describe('PO number'),
  status: z
    .string()
    .nullable()
    .optional()
    .describe('PO status (e.g. draft, pending_approval, ordered, soft_closed, closed)'),
  version: z.number().nullable().optional().describe('PO version number'),
  shipToAddress: z.any().nullable().optional().describe('Ship-to address object'),
  supplier: z.any().nullable().optional().describe('Supplier object with id and name'),
  currency: z.any().nullable().optional().describe('Currency object'),
  paymentTerms: z.any().nullable().optional().describe('Payment terms'),
  orderLines: z.array(z.any()).nullable().optional().describe('Array of order line items'),
  totalAmount: z.any().nullable().optional().describe('Total amount of the purchase order'),
  createdAt: z.string().nullable().optional().describe('Creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('Last update timestamp'),
  createdBy: z.any().nullable().optional().describe('User who created the PO'),
  exportedFlag: z.boolean().nullable().optional().describe('Whether the PO has been exported'),
  rawData: z.any().optional().describe('Complete raw PO data from API')
});

export let searchPurchaseOrders = SlateTool.create(spec, {
  name: 'Search Purchase Orders',
  key: 'search_purchase_orders',
  description: `Search and list purchase orders in Coupa. Filter by status, supplier, date range, export status, and other attributes. Supports pagination and sorting. Use this to find POs matching specific criteria or to retrieve all POs.`,
  instructions: [
    'Use filter parameters like status, supplierId, or date ranges to narrow results.',
    'Coupa filter operators include [gt], [lt], [gte], [lte], [not_eq], [blank], [contains], [starts_with] — append them to field names in the filters object.',
    'Date filters should use ISO 8601 format, e.g. "updated_at[gt]" = "2024-01-01T00:00:00Z".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .string()
        .optional()
        .describe(
          'Filter by status (e.g. "draft", "pending_approval", "ordered", "soft_closed", "closed")'
        ),
      supplierId: z.number().optional().describe('Filter by supplier ID'),
      poNumber: z.string().optional().describe('Filter by PO number'),
      exportedFlag: z.boolean().optional().describe('Filter by exported status'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter POs created after this date (ISO 8601)'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter POs updated after this date (ISO 8601)'),
      filters: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Additional Coupa query filters as key-value pairs, e.g. {"order_lines.description[contains]": "laptop"}'
        ),
      orderBy: z
        .string()
        .optional()
        .describe('Field to sort by (e.g. "created_at", "updated_at", "po_number")'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      limit: z.number().optional().describe('Maximum number of results (default 50, max 50)'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      purchaseOrders: z
        .array(purchaseOrderSchema)
        .describe('List of matching purchase orders'),
      count: z.number().describe('Number of purchase orders returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoupaClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let filters: Record<string, string> = {};
    if (ctx.input.filters) {
      for (let [key, value] of Object.entries(ctx.input.filters)) {
        filters[key] = value;
      }
    }
    if (ctx.input.status) filters.status = ctx.input.status;
    if (ctx.input.supplierId) filters['supplier[id]'] = String(ctx.input.supplierId);
    if (ctx.input.poNumber) filters['po-number'] = ctx.input.poNumber;
    if (ctx.input.createdAfter) filters['created-at[gt]'] = ctx.input.createdAfter;
    if (ctx.input.updatedAfter) filters['updated-at[gt]'] = ctx.input.updatedAfter;

    let results = await client.listPurchaseOrders({
      filters,
      orderBy: ctx.input.orderBy,
      dir: ctx.input.sortDirection,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      exportedFlag: ctx.input.exportedFlag
    });

    let purchaseOrders = (Array.isArray(results) ? results : []).map((po: any) => ({
      purchaseOrderId: po.id,
      poNumber: po['po-number'] ?? po.po_number ?? null,
      status: po.status ?? null,
      version: po.version ?? null,
      shipToAddress: po['ship-to-address'] ?? po.ship_to_address ?? null,
      supplier: po.supplier ?? null,
      currency: po.currency ?? null,
      paymentTerms: po['payment-term'] ?? po.payment_term ?? null,
      orderLines: po['order-lines'] ?? po.order_lines ?? null,
      totalAmount: po.total ?? po.total ?? null,
      createdAt: po['created-at'] ?? po.created_at ?? null,
      updatedAt: po['updated-at'] ?? po.updated_at ?? null,
      createdBy: po['created-by'] ?? po.created_by ?? null,
      exportedFlag: po.exported ?? null,
      rawData: po
    }));

    return {
      output: {
        purchaseOrders,
        count: purchaseOrders.length
      },
      message: `Found **${purchaseOrders.length}** purchase order(s).`
    };
  })
  .build();
