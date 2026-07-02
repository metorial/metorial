import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let orderLineSchema = z.object({
  description: z.string().optional().describe('Line item description'),
  productId: z.number().optional().describe('Product ID'),
  quantity: z.number().optional().describe('Quantity'),
  price: z.number().optional().describe('Unit price'),
  discount1: z.number().optional().describe('First level discount percentage'),
  discount2: z.number().optional().describe('Second level discount percentage'),
  discount3: z.number().optional().describe('Third level discount percentage'),
  discount4: z.number().optional().describe('Fourth level discount percentage'),
  order: z.number().optional().describe('Line item sort order')
});

let salesOrderFields = z
  .object({
    reference: z.string().optional().describe('Order reference'),
    number: z.number().optional().describe('Order number'),
    year: z.number().optional().describe('Order year'),
    statusId: z.number().optional().describe('Order status ID'),
    total: z.number().optional().describe('Order total amount'),
    discount1: z.number().optional().describe('First level discount percentage'),
    discount2: z.number().optional().describe('Second level discount percentage'),
    discount3: z.number().optional().describe('Third level discount percentage'),
    discount4: z.number().optional().describe('Fourth level discount percentage'),
    currencyId: z.number().optional().describe('Currency ID'),
    accountId: z.number().optional().describe('Account/company ID'),
    contactId: z.number().optional().describe('Contact ID'),
    opportunityId: z.number().optional().describe('Associated opportunity ID'),
    salesRepId: z.number().optional().describe('Sales rep ID'),
    branchId: z.number().optional().describe('Branch ID'),
    rateId: z.number().optional().describe('Rate/price list ID'),
    salesForecastDate: z.string().optional().describe('Expected closing date (ISO 8601)'),
    closedDate: z.string().optional().describe('Actual closing date (ISO 8601)'),
    comment: z.string().optional().describe('External comment'),
    internalComment: z.string().optional().describe('Internal comment'),
    archived: z.boolean().optional().describe('Whether the order is archived'),
    blocked: z.boolean().optional().describe('Whether the order is blocked'),
    extId: z.string().optional().describe('External system ID')
  })
  .describe('Sales order fields to set');

export let manageSalesOrder = SlateTool.create(spec, {
  name: 'Manage Sales Order',
  key: 'manage_sales_order',
  description: `Create, update, or delete sales orders in ForceManager.
Sales orders can be linked to accounts, contacts, opportunities, and branches. Supports up to four levels of discounts.
When creating an order, you can also include line items.`,
  instructions: [
    'Use the "list of values" tool to look up valid statusId and currencyId values.',
    'Line items can only be added during creation. Use the "manage sales order line" tool to modify lines after creation.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      salesOrderId: z
        .number()
        .optional()
        .describe('Sales order ID (required for update and delete)'),
      fields: salesOrderFields
        .optional()
        .describe('Order fields (required for create, optional for update)'),
      lines: z
        .array(orderLineSchema)
        .optional()
        .describe('Line items to add when creating an order')
    })
  )
  .output(
    z.object({
      salesOrderId: z.number().optional().describe('ID of the affected sales order'),
      message: z.string().optional().describe('Status message'),
      salesOrder: z.any().optional().describe('Full sales order record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (ctx.input.action === 'create') {
      if (!ctx.input.fields) {
        throw new Error('Fields are required for creating a sales order');
      }
      let result = await client.createSalesOrder(ctx.input.fields);
      let salesOrderId = result?.id;

      if (salesOrderId && ctx.input.lines && ctx.input.lines.length > 0) {
        for (let line of ctx.input.lines) {
          await client.createSalesOrderLine({ ...line, salesOrderId });
        }
      }

      let salesOrder = salesOrderId ? await client.getSalesOrder(salesOrderId) : result;
      return {
        output: { salesOrderId, message: 'Sales order created successfully', salesOrder },
        message: `Created sales order (ID: ${salesOrderId})${ctx.input.lines ? ` with ${ctx.input.lines.length} line(s)` : ''}`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.salesOrderId) {
        throw new Error('salesOrderId is required for updating a sales order');
      }
      await client.updateSalesOrder(ctx.input.salesOrderId, ctx.input.fields || {});
      let salesOrder = await client.getSalesOrder(ctx.input.salesOrderId);
      return {
        output: {
          salesOrderId: ctx.input.salesOrderId,
          message: 'Sales order updated successfully',
          salesOrder
        },
        message: `Updated sales order ID **${ctx.input.salesOrderId}**`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.salesOrderId) {
        throw new Error('salesOrderId is required for deleting a sales order');
      }
      await client.deleteSalesOrder(ctx.input.salesOrderId);
      return {
        output: {
          salesOrderId: ctx.input.salesOrderId,
          message: 'Sales order deleted successfully'
        },
        message: `Deleted sales order ID **${ctx.input.salesOrderId}**`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
