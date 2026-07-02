import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let orderItemSchema = z.object({
  productId: z.string().describe('ID of the product'),
  name: z.string().describe('Name of the product'),
  price: z.number().describe('Price of the product'),
  quantity: z.number().describe('Quantity of the product')
});

export let createOrder = SlateTool.create(spec, {
  name: 'Create Order',
  key: 'create_order',
  description: `Creates a new e-commerce order in MailBluster. Orders link products to customers and can be attributed to specific email campaigns for revenue tracking.
If no lead exists for the provided customer email, a new lead is automatically created.`,
  instructions: [
    'Pass a campaignId to attribute the order to a specific email campaign for revenue reporting.',
    'Each item requires a productId, name, price, and quantity.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      orderId: z.string().describe('Unique identifier for the order'),
      customerEmail: z
        .string()
        .describe('Email address of the customer. A new lead is created if none exists.'),
      customerFirstName: z.string().optional().describe('First name of the customer'),
      customerLastName: z.string().optional().describe('Last name of the customer'),
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID to attribute this order to for revenue tracking'),
      currency: z.string().describe('Currency code (e.g., "USD", "EUR", "AUD")'),
      totalPrice: z.number().describe('Total price of the order'),
      items: z.array(orderItemSchema).describe('List of product items in the order')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('ID of the created order'),
      customerEmail: z.string().describe('Customer email address'),
      campaignId: z.string().nullable().describe('Attributed campaign ID'),
      currency: z.string().describe('Currency code'),
      totalPrice: z.number().describe('Total price'),
      items: z.array(orderItemSchema).describe('Order items'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let order = await client.createOrder({
      id: ctx.input.orderId,
      customerEmail: ctx.input.customerEmail,
      customerFirstName: ctx.input.customerFirstName,
      customerLastName: ctx.input.customerLastName,
      campaignId: ctx.input.campaignId,
      currency: ctx.input.currency,
      totalPrice: ctx.input.totalPrice,
      items: ctx.input.items.map(item => ({
        id: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }))
    });

    let mappedItems = (order.items || []).map(item => ({
      productId: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity
    }));

    return {
      output: {
        orderId: order.id,
        customerEmail: order.customer?.email || ctx.input.customerEmail,
        campaignId: order.campaignId,
        currency: order.currency,
        totalPrice: order.totalPrice,
        items: mappedItems,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      },
      message: `Order **${order.id}** created for ${order.customer?.email || ctx.input.customerEmail} — ${order.currency} ${order.totalPrice}.`
    };
  })
  .build();
