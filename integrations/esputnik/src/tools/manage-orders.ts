import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let orderItemSchema = z.object({
  externalItemId: z.string().describe('External product ID'),
  name: z.string().optional().describe('Product name'),
  category: z.string().optional().describe('Product category'),
  quantity: z.number().describe('Quantity ordered'),
  cost: z.number().optional().describe('Item cost'),
  url: z.string().optional().describe('Product page URL'),
  imageUrl: z.string().optional().describe('Product image URL'),
  description: z.string().optional().describe('Product description')
});

let orderSchema = z.object({
  externalOrderId: z.string().describe('External order ID'),
  externalCustomerId: z.string().optional().describe('External customer ID'),
  email: z.string().optional().describe('Customer email address'),
  phone: z.string().optional().describe('Customer phone number'),
  firstName: z.string().optional().describe('Customer first name'),
  lastName: z.string().optional().describe('Customer last name'),
  totalCost: z.number().describe('Total order cost'),
  status: z
    .enum(['INITIALIZED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED', 'ABANDONED_SHOPPING_CART'])
    .describe('Order status'),
  date: z.string().describe('Order date in ISO 8601 format'),
  currency: z.string().describe('ISO 4217 currency code (e.g., "USD", "EUR")'),
  shipping: z.number().optional().describe('Shipping cost'),
  discount: z.number().optional().describe('Discount amount'),
  deliveryMethod: z.string().optional().describe('Delivery method'),
  paymentMethod: z.string().optional().describe('Payment method'),
  deliveryAddress: z.string().optional().describe('Delivery address'),
  items: z.array(orderItemSchema).optional().describe('Order line items')
});

export let addOrders = SlateTool.create(spec, {
  name: 'Add Orders',
  key: 'add_orders',
  description: `Submit orders to eSputnik for tracking and automated workflows. Each order automatically generates an event (e.g., orderDELIVERED, orderCANCELLED) that can trigger workflows.
Orders require a contact identifier (externalCustomerId, email, or phone) to associate with a contact.
Only **DELIVERED** orders count toward RFM analysis and revenue reporting.`,
  constraints: ['Maximum 1,000 orders per request'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      orders: z.array(orderSchema).min(1).max(1000).describe('Orders to submit')
    })
  )
  .output(
    z.object({
      submitted: z.boolean().describe('Whether the orders were submitted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.addOrders(ctx.input.orders);

    return {
      output: { submitted: true },
      message: `**${ctx.input.orders.length}** order(s) submitted successfully.`
    };
  })
  .build();

export let deleteOrders = SlateTool.create(spec, {
  name: 'Delete Orders',
  key: 'delete_orders',
  description: `Delete orders from eSputnik by their external order IDs.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      externalOrderIds: z.array(z.string()).min(1).describe('External order IDs to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the orders were deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteOrders(ctx.input.externalOrderIds);

    return {
      output: { deleted: true },
      message: `**${ctx.input.externalOrderIds.length}** order(s) deleted successfully.`
    };
  })
  .build();
