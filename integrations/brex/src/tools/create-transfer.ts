import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTransfer = SlateTool.create(spec, {
  name: 'Create Transfer',
  key: 'create_transfer',
  description: `Initiate a payment transfer from a Brex cash account. Supports ACH, wire, check, and book transfers.
Use this to pay vendors, send wire transfers, or mail checks programmatically from your Brex business accounts.`,
  instructions: [
    'Provide the counterparty as either a vendor payment instrument ID or inline routing details.',
    'The originating account defaults to the primary Brex cash account if not specified.',
    'Amounts are in cents — e.g., 100000 = $1,000.00.'
  ],
  constraints: [
    'Only outgoing payments are supported. Receiving payments (ACH debits) is not available via API.'
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
      status: z.string().optional().describe('Current transfer status'),
      amount: z
        .object({
          amount: z.number().describe('Amount in cents'),
          currency: z.string().nullable().describe('Currency code')
        })
        .optional()
        .describe('Transfer amount'),
      description: z.string().nullable().optional().describe('Transfer description')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let transferData: Record<string, any> = {
      amount: {
        amount: ctx.input.amount.amount,
        currency: ctx.input.amount.currency ?? 'USD'
      },
      counterparty: {
        type: ctx.input.counterpartyType,
        payment_instrument_id: ctx.input.paymentInstrumentId
      },
      description: ctx.input.description,
      external_memo: ctx.input.externalMemo
    };

    if (ctx.input.originatingAccountId) {
      transferData.originating_account = {
        type: 'BREX_CASH',
        id: ctx.input.originatingAccountId
      };
    }

    if (ctx.input.approvalType) {
      transferData.approval_type = ctx.input.approvalType;
    }

    let key = ctx.input.idempotencyKey ?? crypto.randomUUID();
    let transfer = await client.createTransfer(transferData, key);

    let amountFormatted = (ctx.input.amount.amount / 100).toFixed(2);

    return {
      output: {
        transferId: transfer.id,
        status: transfer.status,
        amount: transfer.amount
          ? { amount: transfer.amount.amount, currency: transfer.amount.currency }
          : undefined,
        description: transfer.description
      },
      message: `Transfer of **$${amountFormatted}** created (${transfer.id}). Status: ${transfer.status ?? 'pending'}.`
    };
  })
  .build();
