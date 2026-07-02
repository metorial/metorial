import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { PayPalClient } from '../lib/client';
import { spec } from '../spec';

export let authorizeOrder = SlateTool.create(spec, {
  name: 'Authorize Order',
  key: 'authorize_order',
  description: `Authorize payment for an approved PayPal order with AUTHORIZE intent. Returns the authorization ID so it can be captured, voided, or inspected with Manage Payment.`,
  instructions: [
    'The order must have intent **AUTHORIZE**.',
    'The buyer must approve the order before authorization unless the order includes a valid payment source.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      orderId: z.string().describe('Approved PayPal order ID to authorize')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('PayPal order ID'),
      status: z.string().describe('Order status after authorization'),
      authorizationId: z.string().optional().describe('Authorization ID from the payment'),
      authorizationStatus: z.string().optional().describe('Status of the authorization'),
      currencyCode: z.string().optional().describe('Currency of the authorized amount'),
      authorizedAmount: z.string().optional().describe('Authorized amount')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayPalClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      environment: ctx.auth.environment
    });

    let result = await client.authorizeOrder(ctx.input.orderId);
    let authorizations = (result.purchase_units as any[])?.[0]?.payments?.authorizations;
    let authorization = authorizations?.[0];

    return {
      output: {
        orderId: result.id,
        status: result.status,
        authorizationId: authorization?.id,
        authorizationStatus: authorization?.status,
        currencyCode: authorization?.amount?.currency_code,
        authorizedAmount: authorization?.amount?.value
      },
      message: `Order \`${result.id}\` authorized with status **${result.status}**.${authorization ? ` Authorization: ${authorization.amount?.currency_code} ${authorization.amount?.value}` : ''}`
    };
  })
  .build();
