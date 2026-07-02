import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  title: z.string().describe('Product title'),
  sku: z.string().optional().describe('Product SKU'),
  quantity: z.number().describe('Quantity ordered'),
  totalPrice: z.string().describe('Total price for this line item'),
  currency: z.string().describe('ISO 3-letter currency code'),
  weight: z.string().optional().describe('Weight per item'),
  weightUnit: z.enum(['g', 'oz', 'lb', 'kg']).optional().describe('Weight unit'),
  manufacturerCountry: z.string().optional().describe('Country of manufacture (ISO 2)')
});

export let createOrder = SlateTool.create(spec, {
  name: 'Create Order',
  key: 'create_order',
  description: `Load an order into Shippo for shipping management. Orders represent customer purchase requests and can be used to generate shipping rates and labels through the Shippo dashboard or API.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      toAddress: z
        .object({
          name: z.string(),
          company: z.string().optional(),
          street1: z.string(),
          street2: z.string().optional(),
          city: z.string(),
          state: z.string().optional(),
          zip: z.string(),
          country: z.string().describe('ISO 2-letter country code'),
          phone: z.string().optional(),
          email: z.string().optional()
        })
        .describe('Shipping destination address'),
      lineItems: z.array(lineItemSchema).optional().describe('Line items in the order'),
      orderNumber: z.string().optional().describe('Your order number for reference'),
      orderStatus: z
        .enum([
          'UNKNOWN',
          'AWAITPAY',
          'PAID',
          'REFUNDED',
          'CANCELLED',
          'PARTIALLY_FULFILLED',
          'SHIPPED'
        ])
        .optional()
        .describe('Order status'),
      placedAt: z.string().describe('ISO timestamp when the order was placed'),
      shippingCost: z.string().optional().describe('Shipping cost charged to the customer'),
      shippingCostCurrency: z.string().optional().describe('Currency for shipping cost'),
      shippingMethod: z
        .string()
        .optional()
        .describe('Shipping method name displayed to customer'),
      totalPrice: z.string().optional().describe('Total order price'),
      totalTax: z.string().optional().describe('Total tax amount'),
      currency: z.string().optional().describe('ISO 3-letter currency code'),
      weight: z.string().optional().describe('Total weight'),
      weightUnit: z.enum(['g', 'oz', 'lb', 'kg']).optional().describe('Weight unit')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('Unique order identifier in Shippo'),
      orderNumber: z.string().optional(),
      orderStatus: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShippoClient(ctx.auth.token);

    let lineItems = ctx.input.lineItems?.map(item => ({
      title: item.title,
      sku: item.sku,
      quantity: item.quantity,
      total_price: item.totalPrice,
      currency: item.currency,
      weight: item.weight,
      weight_unit: item.weightUnit,
      manufacturer_country: item.manufacturerCountry
    }));

    let result = (await client.createOrder({
      to_address: {
        name: ctx.input.toAddress.name,
        company: ctx.input.toAddress.company,
        street1: ctx.input.toAddress.street1,
        street2: ctx.input.toAddress.street2,
        city: ctx.input.toAddress.city,
        state: ctx.input.toAddress.state,
        zip: ctx.input.toAddress.zip,
        country: ctx.input.toAddress.country,
        phone: ctx.input.toAddress.phone,
        email: ctx.input.toAddress.email
      },
      line_items: lineItems,
      order_number: ctx.input.orderNumber,
      order_status: ctx.input.orderStatus,
      placed_at: ctx.input.placedAt,
      shipping_cost: ctx.input.shippingCost,
      shipping_cost_currency: ctx.input.shippingCostCurrency,
      shipping_method: ctx.input.shippingMethod,
      total_price: ctx.input.totalPrice,
      total_tax: ctx.input.totalTax,
      currency: ctx.input.currency,
      weight: ctx.input.weight,
      weight_unit: ctx.input.weightUnit
    })) as Record<string, any>;

    return {
      output: {
        orderId: result.object_id,
        orderNumber: result.order_number,
        orderStatus: result.order_status
      },
      message: `Order created (${result.object_id}).${ctx.input.orderNumber ? ` Order #${ctx.input.orderNumber}.` : ''} Status: ${result.order_status || 'UNKNOWN'}.`
    };
  })
  .build();
