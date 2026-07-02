import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';
import { spec } from '../spec';

export let chargeAuthorization = SlateTool.create(spec, {
  name: 'Charge Authorization',
  key: 'charge_authorization',
  description: `Charge a customer's saved payment authorization from a previous successful transaction. Useful for recurring payments, one-click checkout, and billing customers without redirecting them.
Amounts are in the **smallest currency unit**.`,
  instructions: [
    'The authorization code comes from a previous successful transaction where the authorization was marked as reusable.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Customer email'),
      amount: z.number().describe('Amount in smallest currency unit'),
      authorizationCode: z
        .string()
        .describe('Authorization code from a previous transaction (e.g., AUTH_xxx)'),
      currency: z.string().optional().describe('Currency code'),
      reference: z
        .string()
        .optional()
        .describe('Unique reference. Auto-generated if not provided'),
      metadata: z.record(z.string(), z.any()).optional().describe('Custom metadata')
    })
  )
  .output(
    z.object({
      transactionId: z.number().describe('Transaction ID'),
      reference: z.string().describe('Transaction reference'),
      status: z.string().describe('Transaction status'),
      amount: z.number().describe('Amount charged'),
      currency: z.string().describe('Currency'),
      gatewayResponse: z.string().describe('Gateway response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.chargeAuthorization({
      email: ctx.input.email,
      amount: ctx.input.amount,
      authorizationCode: ctx.input.authorizationCode,
      currency: ctx.input.currency,
      reference: ctx.input.reference,
      metadata: ctx.input.metadata
    });

    let tx = result.data;

    return {
      output: {
        transactionId: tx.id,
        reference: tx.reference,
        status: tx.status,
        amount: tx.amount,
        currency: tx.currency,
        gatewayResponse: tx.gateway_response
      },
      message: `Charge **${tx.reference}**: status **${tx.status}**. Amount: ${tx.amount} ${tx.currency}. Gateway: ${tx.gateway_response}`
    };
  })
  .build();
