import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getSalesOrder = SlateTool.create(spec, {
  name: 'Get Sales Order',
  key: 'get_sales_order',
  description: `Retrieve detailed information about a specific sales order including line items, totals, status, and customer details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      salesOrderId: z.string().describe('Sales order ID to retrieve')
    })
  )
  .output(
    z.object({
      salesOrderId: z.string().describe('Sales order ID'),
      salesorderNumber: z.string().optional().describe('Sales order number'),
      customerName: z.string().optional().describe('Customer name'),
      customerId: z.string().optional().describe('Customer ID'),
      status: z.string().optional().describe('Order status'),
      total: z.number().optional().describe('Total amount'),
      subTotal: z.number().optional().describe('Sub-total'),
      taxTotal: z.number().optional().describe('Total tax'),
      discount: z.number().optional().describe('Total discount'),
      date: z.string().optional().describe('Order date'),
      shipmentDate: z.string().optional().describe('Shipment date'),
      referenceNumber: z.string().optional().describe('Reference number'),
      lineItems: z
        .array(
          z.object({
            lineItemId: z.string().describe('Line item ID'),
            itemId: z.string().describe('Item ID'),
            name: z.string().describe('Item name'),
            quantity: z.number().describe('Quantity'),
            rate: z.number().describe('Rate'),
            amount: z.number().describe('Line total')
          })
        )
        .optional()
        .describe('Line items'),
      notes: z.string().optional().describe('Notes'),
      terms: z.string().optional().describe('Terms'),
      createdTime: z.string().optional().describe('Created time'),
      lastModifiedTime: z.string().optional().describe('Last modified time')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.getSalesOrder(ctx.input.salesOrderId);
    let so = result.salesorder;

    let lineItems = (so.line_items || []).map((li: any) => ({
      lineItemId: String(li.line_item_id),
      itemId: String(li.item_id),
      name: li.name,
      quantity: li.quantity,
      rate: li.rate,
      amount: li.item_total
    }));

    return {
      output: {
        salesOrderId: String(so.salesorder_id),
        salesorderNumber: so.salesorder_number ?? undefined,
        customerName: so.customer_name ?? undefined,
        customerId: so.customer_id ? String(so.customer_id) : undefined,
        status: so.status ?? undefined,
        total: so.total ?? undefined,
        subTotal: so.sub_total ?? undefined,
        taxTotal: so.tax_total ?? undefined,
        discount: so.discount_total ?? undefined,
        date: so.date ?? undefined,
        shipmentDate: so.shipment_date ?? undefined,
        referenceNumber: so.reference_number ?? undefined,
        lineItems,
        notes: so.notes ?? undefined,
        terms: so.terms ?? undefined,
        createdTime: so.created_time ?? undefined,
        lastModifiedTime: so.last_modified_time ?? undefined
      },
      message: `Sales order **${so.salesorder_number}** — Status: ${so.status}, Total: ${so.total}, ${lineItems.length} line item(s).`
    };
  })
  .build();
