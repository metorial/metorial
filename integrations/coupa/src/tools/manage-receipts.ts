import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoupaClient } from '../lib/client';
import { spec } from '../spec';

let receiptOutputSchema = z.object({
  receiptId: z.number().describe('Coupa internal receipt ID'),
  receiptNumber: z.string().nullable().optional().describe('Receipt number'),
  status: z.string().nullable().optional().describe('Receipt status'),
  purchaseOrderId: z.number().nullable().optional().describe('Associated purchase order ID'),
  receivedBy: z.any().nullable().optional().describe('User who received the goods'),
  receiptDate: z.string().nullable().optional().describe('Receipt date'),
  receiptLines: z.array(z.any()).nullable().optional().describe('Receipt line items'),
  createdAt: z.string().nullable().optional().describe('Creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('Last update timestamp'),
  rawData: z.any().optional().describe('Complete raw receipt data')
});

export let searchReceipts = SlateTool.create(spec, {
  name: 'Search Receipts',
  key: 'search_receipts',
  description: `Search and list receipts in Coupa. Track goods received against purchase orders.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z.string().optional().describe('Filter by receipt status'),
      purchaseOrderId: z.number().optional().describe('Filter by purchase order ID'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter receipts created after this date (ISO 8601)'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter receipts updated after this date (ISO 8601)'),
      exportedFlag: z.boolean().optional().describe('Filter by exported status'),
      filters: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional Coupa query filters'),
      orderBy: z.string().optional().describe('Field to sort by'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      receipts: z.array(receiptOutputSchema).describe('List of matching receipts'),
      count: z.number().describe('Number of receipts returned')
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
    if (ctx.input.purchaseOrderId)
      filters['order-header-id'] = String(ctx.input.purchaseOrderId);
    if (ctx.input.createdAfter) filters['created-at[gt]'] = ctx.input.createdAfter;
    if (ctx.input.updatedAfter) filters['updated-at[gt]'] = ctx.input.updatedAfter;

    let results = await client.listReceipts({
      filters,
      orderBy: ctx.input.orderBy,
      dir: ctx.input.sortDirection,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      exportedFlag: ctx.input.exportedFlag
    });

    let receipts = (Array.isArray(results) ? results : []).map((r: any) => ({
      receiptId: r.id,
      receiptNumber: r['receipt-number'] ?? r.receipt_number ?? null,
      status: r.status ?? null,
      purchaseOrderId: r['order-header-id'] ?? r.order_header_id ?? null,
      receivedBy: r['received-by'] ?? r.received_by ?? null,
      receiptDate: r['receipt-date'] ?? r.receipt_date ?? null,
      receiptLines: r['receipt-lines'] ?? r.receipt_lines ?? null,
      createdAt: r['created-at'] ?? r.created_at ?? null,
      updatedAt: r['updated-at'] ?? r.updated_at ?? null,
      rawData: r
    }));

    return {
      output: {
        receipts,
        count: receipts.length
      },
      message: `Found **${receipts.length}** receipt(s).`
    };
  })
  .build();

export let createReceipt = SlateTool.create(spec, {
  name: 'Create Receipt',
  key: 'create_receipt',
  description: `Create a receipt to record goods received against a purchase order line.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      purchaseOrderLineId: z.number().describe('ID of the purchase order line being received'),
      quantity: z.number().describe('Quantity received'),
      receivedById: z.number().optional().describe('ID of the user receiving the goods'),
      receiptDate: z.string().optional().describe('Date of receipt (ISO 8601)'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values')
    })
  )
  .output(receiptOutputSchema)
  .handleInvocation(async ctx => {
    let client = new CoupaClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let payload: any = {
      'order-line-id': ctx.input.purchaseOrderLineId,
      quantity: String(ctx.input.quantity)
    };

    if (ctx.input.receivedById) payload['received-by'] = { id: ctx.input.receivedById };
    if (ctx.input.receiptDate) payload['receipt-date'] = ctx.input.receiptDate;

    if (ctx.input.customFields) {
      for (let [key, value] of Object.entries(ctx.input.customFields)) {
        payload[key] = value;
      }
    }

    let result = await client.createReceipt(payload);

    return {
      output: {
        receiptId: result.id,
        receiptNumber: result['receipt-number'] ?? result.receipt_number ?? null,
        status: result.status ?? null,
        purchaseOrderId: result['order-header-id'] ?? result.order_header_id ?? null,
        receivedBy: result['received-by'] ?? result.received_by ?? null,
        receiptDate: result['receipt-date'] ?? result.receipt_date ?? null,
        receiptLines: result['receipt-lines'] ?? result.receipt_lines ?? null,
        createdAt: result['created-at'] ?? result.created_at ?? null,
        updatedAt: result['updated-at'] ?? result.updated_at ?? null,
        rawData: result
      },
      message: `Created receipt **#${result.id}** for PO line ${ctx.input.purchaseOrderLineId}.`
    };
  })
  .build();
