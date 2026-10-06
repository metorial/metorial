import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapTransfer } from '../lib/schemas';
import { fail, integerAmount, keyedMutation, required } from '../lib/validation';
import { spec } from '../spec';

export let createTransfer = SlateTool.create(spec, {
  name: 'Create Transfer',
  key: 'create_transfer',
  description: `Initiate a vendor payment transfer from a Brex cash account. Supports vendor ACH, wire and check payment instruments.
Use this to pay vendors, send wire transfers, or mail checks programmatically from your Brex business accounts.`,
  instructions: [
    'VENDOR uses an independently verified vendor payment instrument ID. The legacy BREX_CASH value is unsupported as a counterparty and is rejected.',
    'externalMemo is required. Omit originatingAccountId to read the provider primary cash account. Omitted idempotencyKey generates one invocation key retained in receipt/error metadata; reuse it after ambiguous failures. No automatic retry is performed.',
    'Amounts are in cents — e.g., 100000 = $1,000.00.'
  ],
  constraints: [
    'This tool initiates outgoing vendor transfers. Creation does not prove settlement and financial history cannot be deleted.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      amount: z
        .object({
          amount: z.number().describe('Amount in cents (e.g., 100000 = $1,000.00)'),
          currency: z.string().optional().describe('Currency code (defaults to USD)')
        })
        .describe('Transfer amount'),
      counterpartyType: z
        .enum(['VENDOR', 'BREX_CASH'])
        .describe('Type of the payment counterparty'),
      paymentInstrumentId: z
        .string()
        .describe('Payment instrument or account ID of the counterparty'),
      description: z.string().describe('Internal description for the transfer'),
      externalMemo: z.string().optional().describe('Memo visible to the counterparty'),
      originatingAccountId: z
        .string()
        .optional()
        .describe('ID of the Brex cash account to send from (defaults to primary)'),
      approvalType: z
        .enum(['MANUAL', 'PRE_APPROVED'])
        .optional()
        .describe('Approval handling for the transfer'),
      idempotencyKey: z
        .string()
        .optional()
        .describe('Unique key to prevent duplicate transfers')
    })
  )
  .output(
    z.object({
      transferId: z.string().describe('ID of the created transfer'),
      status: z.string().nullish().describe('Current transfer status'),
      amount: z
        .object({
          amount: z.number().describe('Amount in cents'),
          currency: z.string().nullable().describe('Currency code')
        })
        .optional()
        .describe('Transfer amount'),
      description: z.string().nullable().optional().describe('Transfer description'),
      idempotencyKey: z
        .string()
        .optional()
        .describe('The exact key to reuse after an ambiguous outcome.')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.counterpartyType !== 'VENDOR')
      fail(
        'BREX_CASH is an originating-account type, not a documented counterparty type. This tool supports VENDOR payment instruments only.'
      );
    const amount = integerAmount(ctx.input.amount, true);
    if (amount.currency !== 'USD') fail('Brex transfer creation currently supports USD only.');
    const externalMemo = required(ctx.input.externalMemo, 'externalMemo');
    if (externalMemo.length > 90)
      fail(
        'externalMemo must be at most 90 characters; cheque instruments require at most 40.'
      );
    const client = new Client({ token: ctx.auth.token });
    const originatingId =
      ctx.input.originatingAccountId === undefined
        ? (await client.getPrimaryCashAccount()).id
        : required(ctx.input.originatingAccountId, 'originatingAccountId');
    const data = {
      amount,
      counterparty: {
        type: 'VENDOR',
        payment_instrument_id: required(ctx.input.paymentInstrumentId, 'paymentInstrumentId')
      },
      description: required(ctx.input.description, 'description'),
      external_memo: externalMemo,
      originating_account: { type: 'BREX_CASH', id: originatingId },
      approval_type: ctx.input.approvalType
    };
    const receipt = await keyedMutation(
      ctx.input.idempotencyKey,
      [ctx.auth.token, ctx.auth.refreshToken],
      key => client.createTransfer(data, key)
    );
    const result = receipt.value;
    return {
      output: { ...mapTransfer(result), idempotencyKey: receipt.idempotencyKey },
      message:
        'Transfer created. Inspect its actual status with get_resource; creation does not prove payment settlement. Reuse the same idempotency key after an ambiguous failure.'
    };
  })
  .build();
