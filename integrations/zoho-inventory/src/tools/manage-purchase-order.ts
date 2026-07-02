import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let lineItemSchema = z.object({
  itemId: z.string().describe('Item ID'),
  name: z.string().optional().describe('Item name override'),
  quantity: z.number().describe('Quantity'),
  rate: z.number().optional().describe('Rate per unit'),
  discount: z.string().optional().describe('Discount (e.g., "10%" or "5.00")'),
  taxId: z.string().optional().describe('Tax ID'),
  description: z.string().optional().describe('Line item description')
});

export let managePurchaseOrder = SlateTool.create(spec, {
  name: 'Manage Purchase Order',
  key: 'manage_purchase_order',
  description: `Create, update, or change the status of a purchase order. Supports line items, delivery dates, and shipping details.
Use without a **purchaseOrderId** to create, or with one to update. Use **action** to mark as issued or cancelled.`,
  instructions: [
    'To create a purchase order, provide vendorId and at least one lineItem.',
    'Use action to mark an existing PO as issued or cancelled.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      purchaseOrderId: z
        .string()
        .optional()
        .describe('ID of the purchase order to update. Omit to create.'),
      vendorId: z.string().optional().describe('Vendor contact ID (required for creation)'),
      purchaseorderNumber: z.string().optional().describe('Custom PO number'),
      date: z.string().optional().describe('PO date (YYYY-MM-DD)'),
      deliveryDate: z.string().optional().describe('Expected delivery date (YYYY-MM-DD)'),
      referenceNumber: z.string().optional().describe('Reference number'),
      lineItems: z
        .array(lineItemSchema)
        .optional()
        .describe('Line items for the purchase order'),
      notes: z.string().optional().describe('Vendor-facing notes'),
      terms: z.string().optional().describe('Terms and conditions'),
      discount: z.string().optional().describe('Order-level discount'),
      shippingCharge: z.number().optional().describe('Shipping charge'),
      adjustment: z.number().optional().describe('Adjustment amount'),
      adjustmentDescription: z.string().optional().describe('Description for adjustment'),
      action: z
        .enum(['issue', 'cancel'])
        .optional()
        .describe('Status action to perform on existing PO')
    })
  )
  .output(
    z.object({
      purchaseOrderId: z.string().describe('Purchase order ID'),
      purchaseorderNumber: z.string().optional().describe('PO number'),
      vendorName: z.string().optional().describe('Vendor name'),
      status: z.string().optional().describe('PO status'),
      total: z.number().optional().describe('Total amount'),
      date: z.string().optional().describe('PO date')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.purchaseOrderId && ctx.input.action) {
      if (ctx.input.action === 'issue') {
        await client.markPurchaseOrderIssued(ctx.input.purchaseOrderId);
      } else if (ctx.input.action === 'cancel') {
        await client.cancelPurchaseOrder(ctx.input.purchaseOrderId);
      }
      let result = await client.getPurchaseOrder(ctx.input.purchaseOrderId);
      let po = result.purchaseorder;
      return {
        output: {
          purchaseOrderId: String(po.purchaseorder_id),
          purchaseorderNumber: po.purchaseorder_number ?? undefined,
          vendorName: po.vendor_name ?? undefined,
          status: po.status ?? undefined,
          total: po.total ?? undefined,
          date: po.date ?? undefined
        },
        message: `Purchase order **${po.purchaseorder_number}** ${ctx.input.action === 'issue' ? 'issued' : 'cancelled'}.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.vendorId !== undefined) body.vendor_id = ctx.input.vendorId;
    if (ctx.input.purchaseorderNumber !== undefined)
      body.purchaseorder_number = ctx.input.purchaseorderNumber;
    if (ctx.input.date !== undefined) body.date = ctx.input.date;
    if (ctx.input.deliveryDate !== undefined) body.delivery_date = ctx.input.deliveryDate;
    if (ctx.input.referenceNumber !== undefined)
      body.reference_number = ctx.input.referenceNumber;
    if (ctx.input.notes !== undefined) body.notes = ctx.input.notes;
    if (ctx.input.terms !== undefined) body.terms = ctx.input.terms;
    if (ctx.input.discount !== undefined) body.discount = ctx.input.discount;
    if (ctx.input.shippingCharge !== undefined)
      body.shipping_charge = ctx.input.shippingCharge;
    if (ctx.input.adjustment !== undefined) body.adjustment = ctx.input.adjustment;
    if (ctx.input.adjustmentDescription !== undefined)
      body.adjustment_description = ctx.input.adjustmentDescription;

    if (ctx.input.lineItems) {
      body.line_items = ctx.input.lineItems.map(li => {
        let item: Record<string, any> = { item_id: li.itemId, quantity: li.quantity };
        if (li.name !== undefined) item.name = li.name;
        if (li.rate !== undefined) item.rate = li.rate;
        if (li.discount !== undefined) item.discount = li.discount;
        if (li.taxId !== undefined) item.tax_id = li.taxId;
        if (li.description !== undefined) item.description = li.description;
        return item;
      });
    }

    let result: any;
    let action: string;

    if (ctx.input.purchaseOrderId) {
      result = await client.updatePurchaseOrder(ctx.input.purchaseOrderId, body);
      action = 'updated';
    } else {
      result = await client.createPurchaseOrder(body);
      action = 'created';
    }

    let po = result.purchaseorder;

    return {
      output: {
        purchaseOrderId: String(po.purchaseorder_id),
        purchaseorderNumber: po.purchaseorder_number ?? undefined,
        vendorName: po.vendor_name ?? undefined,
        status: po.status ?? undefined,
        total: po.total ?? undefined,
        date: po.date ?? undefined
      },
      message: `Purchase order **${po.purchaseorder_number}** (${po.purchaseorder_id}) ${action} successfully. Total: ${po.total}.`
    };
  })
  .build();
