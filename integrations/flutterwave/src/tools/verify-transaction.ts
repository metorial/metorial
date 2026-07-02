import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyTransaction = SlateTool.create(spec, {
  name: 'Verify Transaction',
  key: 'verify_transaction',
  description: `Verify the status and details of a payment transaction. You can verify by either the Flutterwave transaction ID or your unique transaction reference (tx_ref). Use this to confirm that a payment was successful, check the charged amount and currency, and retrieve card token for future tokenized charges.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      transactionId: z.number().optional().describe('Flutterwave transaction ID to verify'),
      txRef: z.string().optional().describe('Your unique transaction reference to verify')
    })
  )
  .output(
    z.object({
      transactionId: z.number().describe('Flutterwave transaction ID'),
      txRef: z.string().describe('Your unique transaction reference'),
      flwRef: z.string().describe('Flutterwave reference'),
      amount: z.number().describe('Transaction amount'),
      currency: z.string().describe('Transaction currency'),
      chargedAmount: z.number().describe('Amount charged to the customer'),
      appFee: z.number().optional().describe('Application fee'),
      status: z.string().describe('Transaction status'),
      paymentType: z.string().describe('Payment method used'),
      createdAt: z.string().describe('Transaction timestamp'),
      customerEmail: z.string().optional().describe('Customer email'),
      customerName: z.string().optional().describe('Customer name'),
      customerPhone: z.string().optional().describe('Customer phone number'),
      cardToken: z.string().optional().describe('Card token for future tokenized charges'),
      cardFirst6: z.string().optional().describe('First 6 digits of the card'),
      cardLast4: z.string().optional().describe('Last 4 digits of the card'),
      cardType: z.string().optional().describe('Card brand (VISA, MASTERCARD, etc.)'),
      narration: z.string().optional().describe('Transaction narration/description')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (!ctx.input.transactionId && !ctx.input.txRef) {
      throw new Error('Either transactionId or txRef must be provided');
    }

    let result: any;
    if (ctx.input.transactionId) {
      result = await client.verifyTransaction(ctx.input.transactionId);
    } else {
      result = await client.verifyTransactionByReference(ctx.input.txRef!);
    }

    let t = result.data;

    return {
      output: {
        transactionId: t.id,
        txRef: t.tx_ref,
        flwRef: t.flw_ref,
        amount: t.amount,
        currency: t.currency,
        chargedAmount: t.charged_amount,
        appFee: t.app_fee,
        status: t.status,
        paymentType: t.payment_type,
        createdAt: t.created_at,
        customerEmail: t.customer?.email,
        customerName: t.customer?.name,
        customerPhone: t.customer?.phone_number,
        cardToken: t.card?.token,
        cardFirst6: t.card?.first_6digits,
        cardLast4: t.card?.last_4digits,
        cardType: t.card?.type,
        narration: t.narration
      },
      message: `Transaction **${t.tx_ref}** is **${t.status}** — ${t.currency} ${t.amount}.`
    };
  })
  .build();
