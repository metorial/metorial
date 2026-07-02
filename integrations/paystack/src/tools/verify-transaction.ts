import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';
import { spec } from '../spec';

export let verifyTransaction = SlateTool.create(spec, {
  name: 'Verify Transaction',
  key: 'verify_transaction',
  description: `Verify the status of a transaction using its reference. Returns full transaction details including payment status, amount, customer, and authorization info.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reference: z.string().describe('Transaction reference to verify')
    })
  )
  .output(
    z.object({
      transactionId: z.number().describe('Paystack transaction ID'),
      status: z.string().describe('Transaction status (e.g., success, failed, abandoned)'),
      reference: z.string().describe('Transaction reference'),
      amount: z.number().describe('Amount in smallest currency unit'),
      currency: z.string().describe('Currency code'),
      channel: z.string().describe('Payment channel used'),
      customerEmail: z.string().describe('Customer email'),
      customerCode: z.string().describe('Customer code'),
      paidAt: z.string().nullable().describe('When the transaction was paid'),
      createdAt: z.string().describe('When the transaction was created'),
      gatewayResponse: z.string().describe('Response from the payment gateway'),
      metadata: z.any().optional().describe('Transaction metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.verifyTransaction(ctx.input.reference);
    let tx = result.data;

    return {
      output: {
        transactionId: tx.id,
        status: tx.status,
        reference: tx.reference,
        amount: tx.amount,
        currency: tx.currency,
        channel: tx.channel,
        customerEmail: tx.customer?.email ?? '',
        customerCode: tx.customer?.customer_code ?? '',
        paidAt: tx.paid_at ?? null,
        createdAt: tx.created_at,
        gatewayResponse: tx.gateway_response,
        metadata: tx.metadata
      },
      message: `Transaction **${tx.reference}** status: **${tx.status}**. Amount: ${tx.amount} ${tx.currency}. Gateway: ${tx.gateway_response}`
    };
  })
  .build();
