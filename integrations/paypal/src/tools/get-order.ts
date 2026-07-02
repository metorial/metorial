import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { PayPalClient } from '../lib/client';
import { spec } from '../spec';

export let getOrder = SlateTool.create(spec, {
  name: 'Get Order',
  key: 'get_order',
  description: `Retrieve details of a PayPal order by its ID. Returns the full order object including status, purchase units, payer information, and payment details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      orderId: z.string().describe('PayPal order ID to retrieve')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('PayPal order ID'),
      status: z
        .string()
        .describe(
          'Order status (CREATED, SAVED, APPROVED, VOIDED, COMPLETED, PAYER_ACTION_REQUIRED)'
        ),
      intent: z.string().optional().describe('Payment intent (CAPTURE or AUTHORIZE)'),
      currencyCode: z
        .string()
        .optional()
        .describe('Currency code of the primary purchase unit'),
      totalAmount: z.string().optional().describe('Total amount of the primary purchase unit'),
      payerEmail: z.string().optional().describe('Payer email address'),
      payerId: z.string().optional().describe('PayPal payer ID'),
      createTime: z.string().optional().describe('Order creation timestamp'),
      updateTime: z.string().optional().describe('Last update timestamp'),
      purchaseUnits: z.array(z.any()).optional().describe('Full purchase unit details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayPalClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      environment: ctx.auth.environment
    });

    let order = await client.getOrder(ctx.input.orderId);
    let primaryUnit = (order.purchase_units as any[])?.[0];

    return {
      output: {
        orderId: order.id,
        status: order.status,
        intent: order.intent,
        currencyCode: primaryUnit?.amount?.currency_code,
        totalAmount: primaryUnit?.amount?.value,
        payerEmail: order.payer?.email_address,
        payerId: order.payer?.payer_id,
        createTime: order.create_time,
        updateTime: order.update_time,
        purchaseUnits: order.purchase_units
      },
      message: `Order \`${order.id}\` is **${order.status}**${primaryUnit ? ` for ${primaryUnit.amount?.currency_code} ${primaryUnit.amount?.value}` : ''}.`
    };
  })
  .build();
