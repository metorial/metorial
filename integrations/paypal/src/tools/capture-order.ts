import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { PayPalClient } from '../lib/client';
import { spec } from '../spec';

export let captureOrder = SlateTool.create(spec, {
  name: 'Capture Order',
  key: 'capture_order',
  description: `Capture payment for an approved PayPal order with CAPTURE intent. The order must have been approved by the buyer first.`,
  instructions: [
    'The order must be in **APPROVED** status before capturing.',
    'For AUTHORIZE intent orders, use **Authorize Order** first, then capture the authorization with **Manage Payment**.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      orderId: z.string().describe('PayPal order ID to capture')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('PayPal order ID'),
      status: z.string().describe('Order status after capture'),
      captureId: z.string().optional().describe('Capture ID from the payment'),
      captureStatus: z.string().optional().describe('Status of the capture'),
      currencyCode: z.string().optional().describe('Currency of the captured amount'),
      capturedAmount: z.string().optional().describe('Captured amount')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayPalClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      environment: ctx.auth.environment
    });

    let result = await client.captureOrder(ctx.input.orderId);
    let captures = (result.purchase_units as any[])?.[0]?.payments?.captures;
    let capture = captures?.[0];

    return {
      output: {
        orderId: result.id,
        status: result.status,
        captureId: capture?.id,
        captureStatus: capture?.status,
        currencyCode: capture?.amount?.currency_code,
        capturedAmount: capture?.amount?.value
      },
      message: `Order \`${result.id}\` captured with status **${result.status}**.${capture ? ` Capture: ${capture.amount?.currency_code} ${capture.amount?.value}` : ''}`
    };
  })
  .build();
