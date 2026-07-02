import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';
import { spec } from '../spec';

export let initializeTransaction = SlateTool.create(spec, {
  name: 'Initialize Transaction',
  key: 'initialize_transaction',
  description: `Initialize a new payment transaction on Paystack. Returns an authorization URL where the customer can complete payment, or use for programmatic charge flows.
Amounts are in the **smallest currency unit** (e.g., kobo for NGN: NGN 100 = 10000).`,
  instructions: [
    'Amount must be in the smallest currency unit (e.g., kobo for NGN, pesewas for GHS). Multiply the base amount by 100.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Customer email address'),
      amount: z
        .number()
        .describe('Amount in smallest currency unit (e.g., kobo). NGN 100 = 10000'),
      currency: z
        .string()
        .optional()
        .describe('Currency code (e.g., NGN, GHS, ZAR, KES, USD)'),
      reference: z
        .string()
        .optional()
        .describe('Unique transaction reference. Auto-generated if not provided'),
      callbackUrl: z.string().optional().describe('URL to redirect to after payment'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata to attach to the transaction'),
      channels: z
        .array(z.string())
        .optional()
        .describe(
          'Payment channels to use (e.g., card, bank, ussd, qr, mobile_money, bank_transfer)'
        ),
      subaccount: z.string().optional().describe('Subaccount code to split payment to'),
      splitCode: z.string().optional().describe('Split code for transaction splits'),
      transactionCharge: z
        .number()
        .optional()
        .describe(
          'Flat fee (in smallest currency unit) to charge the subaccount for this transaction'
        ),
      bearer: z
        .enum(['account', 'subaccount'])
        .optional()
        .describe('Who bears the Paystack charges')
    })
  )
  .output(
    z.object({
      authorizationUrl: z.string().describe('URL for customer to complete payment'),
      accessCode: z.string().describe('Access code for the transaction'),
      reference: z.string().describe('Transaction reference')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.initializeTransaction({
      email: ctx.input.email,
      amount: ctx.input.amount,
      currency: ctx.input.currency,
      reference: ctx.input.reference,
      callbackUrl: ctx.input.callbackUrl,
      metadata: ctx.input.metadata,
      channels: ctx.input.channels,
      subaccount: ctx.input.subaccount,
      splitCode: ctx.input.splitCode,
      transactionCharge: ctx.input.transactionCharge,
      bearer: ctx.input.bearer
    });

    let txData = result.data;

    return {
      output: {
        authorizationUrl: txData.authorization_url,
        accessCode: txData.access_code,
        reference: txData.reference
      },
      message: `Transaction initialized with reference **${txData.reference}**. Payment URL: ${txData.authorization_url}`
    };
  })
  .build();
