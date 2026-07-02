import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let lineFields = z
  .object({
    salesOrderId: z.number().optional().describe('Sales order ID this line belongs to'),
    description: z.string().optional().describe('Line item description'),
    productId: z.number().optional().describe('Product ID'),
    quantity: z.number().optional().describe('Quantity'),
    price: z.number().optional().describe('Unit price'),
    discount1: z.number().optional().describe('First level discount percentage'),
    discount2: z.number().optional().describe('Second level discount percentage'),
    discount3: z.number().optional().describe('Third level discount percentage'),
    discount4: z.number().optional().describe('Fourth level discount percentage'),
    order: z.number().optional().describe('Sort order within the sales order')
  })
  .describe('Sales order line fields');

export let manageSalesOrderLine = SlateTool.create(spec, {
  name: 'Manage Sales Order Line',
  key: 'manage_sales_order_line',
  description: `Create, update, or delete individual line items within a sales order in ForceManager.
Line items reference products with quantity, pricing, and up to four levels of discounts.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      lineId: z.number().optional().describe('Line item ID (required for update and delete)'),
      fields: lineFields
        .optional()
        .describe('Line item fields (required for create, optional for update)')
    })
  )
  .output(
    z.object({
      lineId: z.number().optional().describe('ID of the affected line item'),
      message: z.string().optional().describe('Status message'),
      line: z.any().optional().describe('Full line item record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (ctx.input.action === 'create') {
      if (!ctx.input.fields) {
        throw new Error('Fields are required for creating a line item');
      }
      if (!ctx.input.fields.salesOrderId) {
        throw new Error('salesOrderId is required for creating a line item');
      }
      let result = await client.createSalesOrderLine(ctx.input.fields);
      let lineId = result?.id;
      let line = lineId ? await client.getSalesOrderLine(lineId) : result;
      return {
        output: { lineId, message: 'Line item created successfully', line },
        message: `Created line item (ID: ${lineId}) on sales order **${ctx.input.fields.salesOrderId}**`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.lineId) {
        throw new Error('lineId is required for updating a line item');
      }
      await client.updateSalesOrderLine(ctx.input.lineId, ctx.input.fields || {});
      let line = await client.getSalesOrderLine(ctx.input.lineId);
      return {
        output: { lineId: ctx.input.lineId, message: 'Line item updated successfully', line },
        message: `Updated line item ID **${ctx.input.lineId}**`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.lineId) {
        throw new Error('lineId is required for deleting a line item');
      }
      await client.deleteSalesOrderLine(ctx.input.lineId);
      return {
        output: { lineId: ctx.input.lineId, message: 'Line item deleted successfully' },
        message: `Deleted line item ID **${ctx.input.lineId}**`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
