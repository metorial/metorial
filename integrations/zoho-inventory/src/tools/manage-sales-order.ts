import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let lineItemSchema = z.object({
  itemId: z.string().describe('Item ID'),
  name: z.string().optional().describe('Item name override'),
  quantity: z.number().describe('Quantity ordered'),
  rate: z.number().optional().describe('Rate per unit'),
  discount: z.string().optional().describe('Discount (e.g., "10%" or "5.00")'),
  taxId: z.string().optional().describe('Tax ID for this line item'),
  description: z.string().optional().describe('Line item description'),
  warehouseId: z.string().optional().describe('Warehouse to fulfill from')
});

export let manageSalesOrder = SlateTool.create(spec, {
  name: 'Manage Sales Order',
  key: 'manage_sales_order',
  description: `Create, update, or change the status of a sales order. Supports line items with per-item quantities, rates, discounts, and warehouse assignment.
Use without a **salesOrderId** to create, or with one to update. Use **action** to confirm or void an existing order.`,
  instructions: [
    'To create a sales order, provide customerId and at least one lineItem.',
    'To update, provide the salesOrderId plus fields to change.',
    'Use the action field to confirm or void an existing order.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      salesOrderId: z
        .string()
        .optional()
        .describe('ID of the sales order to update. Omit to create.'),
      customerId: z
        .string()
        .optional()
        .describe('Customer contact ID (required for creation)'),
      salesorderNumber: z.string().optional().describe('Custom sales order number'),
      date: z.string().optional().describe('Sales order date (YYYY-MM-DD)'),
      shipmentDate: z.string().optional().describe('Expected shipment date (YYYY-MM-DD)'),
      referenceNumber: z.string().optional().describe('Reference number'),
      lineItems: z.array(lineItemSchema).optional().describe('Line items for the sales order'),
      notes: z.string().optional().describe('Customer-facing notes'),
      terms: z.string().optional().describe('Terms and conditions'),
      discount: z.string().optional().describe('Order-level discount (e.g., "10%" or "5.00")'),
      shippingCharge: z.number().optional().describe('Shipping charge amount'),
      adjustment: z.number().optional().describe('Adjustment amount (positive or negative)'),
      adjustmentDescription: z.string().optional().describe('Description for the adjustment'),
      action: z
        .enum(['confirm', 'void'])
        .optional()
        .describe('Status action to perform on an existing order')
    })
  )
  .output(
    z.object({
      salesOrderId: z.string().describe('Sales order ID'),
      salesorderNumber: z.string().optional().describe('Sales order number'),
      customerName: z.string().optional().describe('Customer name'),
      status: z.string().optional().describe('Sales order status'),
      total: z.number().optional().describe('Total amount'),
      date: z.string().optional().describe('Sales order date')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.salesOrderId && ctx.input.action) {
      if (ctx.input.action === 'confirm') {
        await client.confirmSalesOrder(ctx.input.salesOrderId);
      } else if (ctx.input.action === 'void') {
        await client.voidSalesOrder(ctx.input.salesOrderId);
      }
      let result = await client.getSalesOrder(ctx.input.salesOrderId);
      let so = result.salesorder;
      return {
        output: {
          salesOrderId: String(so.salesorder_id),
          salesorderNumber: so.salesorder_number ?? undefined,
          customerName: so.customer_name ?? undefined,
          status: so.status ?? undefined,
          total: so.total ?? undefined,
          date: so.date ?? undefined
        },
        message: `Sales order **${so.salesorder_number}** ${ctx.input.action === 'confirm' ? 'confirmed' : 'voided'}.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.customerId !== undefined) body.customer_id = ctx.input.customerId;
    if (ctx.input.salesorderNumber !== undefined)
      body.salesorder_number = ctx.input.salesorderNumber;
    if (ctx.input.date !== undefined) body.date = ctx.input.date;
    if (ctx.input.shipmentDate !== undefined) body.shipment_date = ctx.input.shipmentDate;
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
        if (li.warehouseId !== undefined) item.warehouse_id = li.warehouseId;
        return item;
      });
    }

    let result: any;
    let action: string;

    if (ctx.input.salesOrderId) {
      result = await client.updateSalesOrder(ctx.input.salesOrderId, body);
      action = 'updated';
    } else {
      result = await client.createSalesOrder(body);
      action = 'created';
    }

    let so = result.salesorder;

    return {
      output: {
        salesOrderId: String(so.salesorder_id),
        salesorderNumber: so.salesorder_number ?? undefined,
        customerName: so.customer_name ?? undefined,
        status: so.status ?? undefined,
        total: so.total ?? undefined,
        date: so.date ?? undefined
      },
      message: `Sales order **${so.salesorder_number}** (${so.salesorder_id}) ${action} successfully. Total: ${so.total}.`
    };
  })
  .build();
