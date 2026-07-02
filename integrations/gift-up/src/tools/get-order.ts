import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOrder = SlateTool.create(spec, {
  name: 'Get Order',
  key: 'get_order',
  description: `Retrieve full order details by order ID, including gift cards, purchaser info, revenue, custom fields, notes, and download links.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orderId: z.string().describe('The order ID to retrieve')
    })
  )
  .output(
    z
      .object({
        orderId: z.string().describe('Order ID'),
        orderNumber: z.string().describe('Order number'),
        createdOn: z.string().describe('Creation date'),
        purchaserEmail: z.string().describe('Purchaser email'),
        purchaserName: z.string().describe('Purchaser name'),
        revenue: z.number().describe('Order revenue'),
        currency: z.string().describe('Currency code'),
        tip: z.number().describe('Tip amount'),
        serviceFee: z.number().describe('Service fee'),
        discount: z.number().describe('Discount applied'),
        selectedRecipient: z.string().describe('Recipient selection type'),
        giftCards: z
          .array(
            z
              .object({
                code: z.string().describe('Gift card code'),
                title: z.string().nullable().describe('Gift card title'),
                canBeRedeemed: z.boolean().describe('Whether redeemable'),
                remainingValue: z.number().describe('Remaining value'),
                initialValue: z.number().describe('Initial value')
              })
              .passthrough()
          )
          .describe('Gift cards in this order'),
        customFields: z
          .array(
            z.object({
              label: z.string(),
              value: z.any()
            })
          )
          .optional()
          .describe('Custom fields'),
        salesTaxes: z
          .array(
            z.object({
              label: z.string(),
              amount: z.number(),
              type: z.string()
            })
          )
          .optional()
          .describe('Sales taxes'),
        notes: z
          .array(
            z.object({
              noteId: z.string(),
              content: z.string(),
              createdOn: z.string(),
              username: z.string()
            })
          )
          .optional()
          .describe('Order notes'),
        metadata: z.record(z.string(), z.string()).optional().describe('Metadata')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    });

    let order = await client.getOrder(ctx.input.orderId);

    let notes = order.notes?.map((n: any) => ({
      noteId: n.id,
      content: n.content,
      createdOn: n.createdOn,
      username: n.username
    }));

    return {
      output: {
        ...order,
        orderId: order.id,
        notes
      },
      message: `Order **#${order.orderNumber}** by ${order.purchaserName} — ${order.giftCards?.length ?? 0} gift card(s), revenue: ${order.revenue} ${order.currency}`
    };
  })
  .build();
