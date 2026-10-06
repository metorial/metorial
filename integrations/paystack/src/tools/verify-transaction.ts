import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';

import {
  exactId,
  optionalNumericId,
  optionalRecord,
  record,
  sanitizeMetadata,
  validateOutput
} from '../lib/transport';
import { spec } from '../spec';

const verifyTransactionOutput = z.object({
  exactTransactionId: z
    .string()
    .describe('Exact unsigned 64-bit transaction ID; use this field for durable identifiers'),
  transactionId: z.number().optional().describe('Paystack transaction ID'),
  status: z.string().describe('Transaction status (e.g., success, failed, abandoned)'),
  reference: z.string().describe('Transaction reference'),
  amount: z.number().describe('Amount in smallest currency unit'),
  currency: z.string().describe('Currency code'),
  channel: z.string().optional().describe('Payment channel used'),
  customerEmail: z.string().describe('Customer email'),
  customerCode: z.string().describe('Customer code'),
  paidAt: z.string().nullable().describe('When the transaction was paid'),
  createdAt: z.string().describe('When the transaction was created'),
  gatewayResponse: z.string().optional().describe('Response from the payment gateway'),
  metadata: z.any().optional().describe('Transaction metadata')
});

export let verifyTransaction = SlateTool.create(spec, {
  name: 'Verify Transaction',
  key: 'verify_transaction',
  description: `Verify the status of a transaction using its reference. Returns full transaction details including payment status, amount and selected customer metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reference: z.string().describe('Transaction reference to verify')
    })
  )
  .output(verifyTransactionOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.verifyTransaction(ctx.input.reference);
    const tx = record(result.data);
    const output = {
      transactionId: optionalNumericId(tx.id),
      exactTransactionId: exactId(tx.id),
      status: tx.status,
      reference: tx.reference,
      amount: tx.amount,
      currency: tx.currency,
      channel: tx.channel ?? undefined,
      customerEmail: optionalRecord(tx.customer).email,
      customerCode: optionalRecord(tx.customer).customer_code,
      paidAt: tx.paid_at ?? tx.paidAt ?? null,
      createdAt: tx.created_at ?? tx.createdAt,
      gatewayResponse: tx.gateway_response ?? undefined,
      metadata: sanitizeMetadata(tx.metadata, ctx.auth.token)
    };
    return {
      output: validateOutput(verifyTransactionOutput, output),
      message: 'Transaction status retrieved; review status before fulfillment.'
    };
  })
  .build();
