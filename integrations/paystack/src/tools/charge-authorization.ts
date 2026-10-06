import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';

import { exactId, optionalNumericId, record, validateOutput } from '../lib/transport';
import { spec } from '../spec';

const chargeAuthorizationOutput = z.object({
  exactTransactionId: z
    .string()
    .describe('Exact unsigned 64-bit transaction ID; use this field for durable identifiers'),
  transactionId: z.number().optional().describe('Transaction ID'),
  reference: z.string().describe('Transaction reference'),
  status: z.string().describe('Transaction status'),
  amount: z.number().describe('Amount charged'),
  currency: z.string().describe('Currency'),
  gatewayResponse: z.string().optional().describe('Gateway response message')
});

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
  .output(chargeAuthorizationOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.chargeAuthorization(ctx.input);
    const tx = record(result.data);
    const output = {
      transactionId: optionalNumericId(tx.id),
      exactTransactionId: exactId(tx.id),
      reference: tx.reference,
      status: tx.status,
      amount: tx.amount,
      currency: tx.currency,
      gatewayResponse: tx.gateway_response ?? undefined
    };
    return {
      output: validateOutput(chargeAuthorizationOutput, output),
      message: 'Charge response received; review status and reconcile before retrying.'
    };
  })
  .build();
