import { SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let createOrder = SlateTool.create(spec, {
  name: 'Create Order',
  key: 'create_order',
  description: `Create a new order in sevDesk. Orders can later be converted to invoices using the Create Invoice from Order tool.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact for this order'),
      orderDate: z.string().describe('Order date in YYYY-MM-DD format'),
      header: z.string().optional().describe('Order header/title'),
      headText: z.string().optional().describe('Text above line items'),
      footText: z.string().optional().describe('Text below line items'),
      orderNumber: z.string().optional().describe('Custom order number'),
      deliveryDate: z.string().optional().describe('Delivery date in YYYY-MM-DD format'),
      currency: z.string().optional().describe('Currency code (default: EUR)'),
      taxRuleId: z.string().optional().describe('Tax rule ID'),
      status: z
        .number()
        .optional()
        .describe(
          'Status: 100=Draft, 200=Confirmed, 300=Partially delivered, 500=Delivered, 750=Partially invoiced, 1000=Invoiced'
        ),
      version: z.number().optional().describe('Version number')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('ID of the created order'),
      orderNumber: z.string().optional(),
      status: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });

    let orderData: Record<string, any> = {
      objectName: 'Order',
      contact: { id: ctx.input.contactId, objectName: 'Contact' },
      orderDate: ctx.input.orderDate,
      status: ctx.input.status ?? 100,
      currency: ctx.input.currency ?? 'EUR',
      mapAll: true,
      orderType: 'AN'
    };

    if (ctx.input.header) orderData.header = ctx.input.header;
    if (ctx.input.headText) orderData.headText = ctx.input.headText;
    if (ctx.input.footText) orderData.footText = ctx.input.footText;
    if (ctx.input.orderNumber) orderData.orderNumber = ctx.input.orderNumber;
    if (ctx.input.deliveryDate) orderData.deliveryDate = ctx.input.deliveryDate;
    if (ctx.input.taxRuleId) {
      orderData.taxRule = { id: ctx.input.taxRuleId, objectName: 'TaxRule' };
    }
    if (ctx.input.version !== undefined) orderData.version = ctx.input.version;

    let order = await client.createOrder(orderData);

    return {
      output: {
        orderId: String(order.id),
        orderNumber: order.orderNumber ?? undefined,
        status: order.status != null ? String(order.status) : undefined
      },
      message: `Created order **${order.orderNumber ?? order.id}** for contact ${ctx.input.contactId}.`
    };
  })
  .build();
