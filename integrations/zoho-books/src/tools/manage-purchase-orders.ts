import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listPurchaseOrdersTool = SlateTool.create(spec, {
  name: 'List Purchase Orders',
  key: 'list_purchase_orders',
  description: `Search and list purchase orders with filtering by status, vendor, and date range.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      vendorId: z.string().optional().describe('Filter by vendor ID'),
      status: z.enum(['draft', 'open', 'billed', 'cancelled', 'closed']).optional(),
      searchText: z.string().optional(),
      page: z.number().optional().default(1),
      perPage: z.number().optional().default(200)
    })
  )
  .output(
    z.object({
      purchaseOrders: z.array(
        z.object({
          purchaseOrderId: z.string(),
          purchaseorderNumber: z.string().optional(),
          vendorName: z.string().optional(),
          vendorId: z.string().optional(),
          status: z.string().optional(),
          date: z.string().optional(),
          deliveryDate: z.string().optional(),
          total: z.number().optional(),
          currencyCode: z.string().optional(),
          createdTime: z.string().optional()
        })
      ),
      pageContext: z
        .object({
          page: z.number(),
          perPage: z.number(),
          hasMorePage: z.boolean()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let query: Record<string, any> = { page: ctx.input.page, per_page: ctx.input.perPage };
    if (ctx.input.vendorId) query.vendor_id = ctx.input.vendorId;
    if (ctx.input.status) query.status = ctx.input.status;
    if (ctx.input.searchText) query.search_text = ctx.input.searchText;

    let resp = await client.listPurchaseOrders(query);
    let purchaseOrders = (resp.purchaseorders || []).map((po: any) => ({
      purchaseOrderId: po.purchaseorder_id,
      purchaseorderNumber: po.purchaseorder_number,
      vendorName: po.vendor_name,
      vendorId: po.vendor_id,
      status: po.status,
      date: po.date,
      deliveryDate: po.delivery_date,
      total: po.total,
      currencyCode: po.currency_code,
      createdTime: po.created_time
    }));

    let pageContext = resp.page_context
      ? {
          page: resp.page_context.page,
          perPage: resp.page_context.per_page,
          hasMorePage: resp.page_context.has_more_page
        }
      : undefined;

    return {
      output: { purchaseOrders, pageContext },
      message: `Found **${purchaseOrders.length}** purchase order(s).`
    };
  })
  .build();

export let createPurchaseOrderTool = SlateTool.create(spec, {
  name: 'Create Purchase Order',
  key: 'create_purchase_order',
  description: `Create a new purchase order for a vendor with line items. Can optionally convert to a bill.`,
  instructions: [
    'Provide a vendorId and at least one line item.',
    'Set convertToBill to immediately create a bill from the purchase order.'
  ]
})
  .input(
    z.object({
      vendorId: z.string().describe('ID of the vendor'),
      purchaseorderNumber: z.string().optional(),
      referenceNumber: z.string().optional(),
      date: z.string().optional().describe('PO date (YYYY-MM-DD)'),
      deliveryDate: z.string().optional().describe('Expected delivery date (YYYY-MM-DD)'),
      lineItems: z
        .array(
          z.object({
            itemId: z.string().optional(),
            name: z.string().optional(),
            description: z.string().optional(),
            quantity: z.number().optional().default(1),
            rate: z.number().optional(),
            taxId: z.string().optional()
          })
        )
        .min(1),
      notes: z.string().optional(),
      terms: z.string().optional(),
      convertToBill: z.boolean().optional().default(false)
    })
  )
  .output(
    z.object({
      purchaseOrderId: z.string(),
      purchaseorderNumber: z.string().optional(),
      status: z.string().optional(),
      total: z.number().optional(),
      currencyCode: z.string().optional(),
      convertedBillId: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let input = ctx.input;

    let payload: Record<string, any> = {
      vendor_id: input.vendorId,
      line_items: input.lineItems.map(li => ({
        item_id: li.itemId,
        name: li.name,
        description: li.description,
        quantity: li.quantity,
        rate: li.rate,
        tax_id: li.taxId
      }))
    };

    if (input.purchaseorderNumber) payload.purchaseorder_number = input.purchaseorderNumber;
    if (input.referenceNumber) payload.reference_number = input.referenceNumber;
    if (input.date) payload.date = input.date;
    if (input.deliveryDate) payload.delivery_date = input.deliveryDate;
    if (input.notes) payload.notes = input.notes;
    if (input.terms) payload.terms = input.terms;

    let resp = await client.createPurchaseOrder(payload);
    let po = resp.purchaseorder;

    let convertedBillId: string | undefined;
    if (input.convertToBill && po.purchaseorder_id) {
      let convResp = await client.convertPurchaseOrderToBill(po.purchaseorder_id);
      convertedBillId = convResp.bill?.bill_id;
    }

    return {
      output: {
        purchaseOrderId: po.purchaseorder_id,
        purchaseorderNumber: po.purchaseorder_number,
        status: po.status,
        total: po.total,
        currencyCode: po.currency_code,
        convertedBillId
      },
      message: `Created purchase order **${po.purchaseorder_number}** for ${po.currency_code} ${po.total}.${convertedBillId ? ` Converted to bill ${convertedBillId}.` : ''}`
    };
  })
  .build();
