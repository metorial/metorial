import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOrderTool = SlateTool.create(spec, {
  name: 'Get Order',
  key: 'get_order',
  description: `Retrieve a specific order by ID. Returns full order details including customer info, pricing, tax, discounts, currency, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orderId: z.string().describe('The ID of the order to retrieve')
    })
  )
  .output(
    z.object({
      orderId: z.string(),
      storeId: z.number(),
      customerId: z.number(),
      identifier: z.string(),
      orderNumber: z.number(),
      userName: z.string(),
      userEmail: z.string(),
      currency: z.string(),
      currencyRate: z.string(),
      subtotal: z.number(),
      discountTotal: z.number(),
      tax: z.number(),
      total: z.number(),
      subtotalFormatted: z.string(),
      discountTotalFormatted: z.string(),
      taxFormatted: z.string(),
      totalFormatted: z.string(),
      status: z.string(),
      statusFormatted: z.string(),
      refunded: z.boolean(),
      refundedAt: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.getOrder(ctx.input.orderId);
    let order = response.data;
    let attrs = order.attributes;

    let output = {
      orderId: order.id,
      storeId: attrs.store_id,
      customerId: attrs.customer_id,
      identifier: attrs.identifier,
      orderNumber: attrs.order_number,
      userName: attrs.user_name,
      userEmail: attrs.user_email,
      currency: attrs.currency,
      currencyRate: attrs.currency_rate,
      subtotal: attrs.subtotal,
      discountTotal: attrs.discount_total,
      tax: attrs.tax,
      total: attrs.total,
      subtotalFormatted: attrs.subtotal_formatted,
      discountTotalFormatted: attrs.discount_total_formatted,
      taxFormatted: attrs.tax_formatted,
      totalFormatted: attrs.total_formatted,
      status: attrs.status,
      statusFormatted: attrs.status_formatted,
      refunded: attrs.refunded,
      refundedAt: attrs.refunded_at,
      createdAt: attrs.created_at,
      updatedAt: attrs.updated_at
    };

    return {
      output,
      message: `Order **#${attrs.order_number}** (${attrs.status_formatted}) — ${attrs.total_formatted} ${attrs.currency} by ${attrs.user_email}.`
    };
  })
  .build();
