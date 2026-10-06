import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTransfer = SlateTool.create(spec, {
  name: 'Create Transfer',
  key: 'create_transfer',
  description: `Initiate a payout/transfer to a bank account or mobile money wallet. Supports multiple currencies (NGN, USD, EUR, GHS, KES, etc.) and cross-currency transfers. You can optionally check transfer fees and exchange rates before sending.`,
  instructions: [
    'Use the "Resolve Bank Account" tool with action "list_banks" to find the correct bank code for the destination account.',
    'For cross-currency transfers, set debitCurrency to the currency you want debited from your balance.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      accountBank: z
        .string()
        .describe(
          'Recipient bank code (e.g. "044" for Access Bank). Use resolve_bank_account with action list_banks to find codes.'
        ),
      accountNumber: z.string().describe('Recipient account number'),
      amount: z.number().describe('Amount to transfer'),
      currency: z.string().describe('Transfer currency (e.g. NGN, USD, EUR, GHS, KES)'),
      narration: z.string().describe('Description/reason for the transfer'),
      destinationBranchCode: z
        .string()
        .optional()
        .describe(
          'Required for banks with branches; discover branches with resolve_bank_account action list_branches'
        ),
      meta: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe(
          'Provider-required destination metadata for the selected country and payment method'
        ),
      reference: z.string().optional().describe('Your unique reference for the transfer'),
      debitCurrency: z
        .string()
        .optional()
        .describe('Currency to debit from your balance (for cross-currency transfers)'),
      beneficiaryName: z
        .string()
        .optional()
        .describe('Recipient name (required for international transfers)')
    })
  )
  .output(
    z.object({
      transferId: z.number().describe('Flutterwave transfer ID'),
      accountNumber: z.string().describe('Recipient account number'),
      bankName: z.string().optional().describe('Recipient bank name'),
      fullName: z.string().optional().describe('Recipient full name'),
      amount: z.number().describe('Transfer amount'),
      currency: z.string().describe('Transfer currency'),
      fee: z.number().optional().describe('Transfer fee'),
      status: z.string().describe('Transfer status'),
      destinationBranchCode: z
        .string()
        .optional()
        .describe(
          'Required for banks with branches; discover branches with resolve_bank_account action list_branches'
        ),
      meta: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe(
          'Provider-required destination metadata for the selected country and payment method'
        ),
      reference: z.string().optional().describe('Transfer reference'),
      narration: z.string().optional().describe('Transfer narration'),
      requiresApproval: z.boolean().optional().describe('Whether the transfer needs approval'),
      createdAt: z.string().optional().describe('Transfer creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.config.environment });

    let result = await client.createTransfer({
      accountBank: ctx.input.accountBank,
      accountNumber: ctx.input.accountNumber,
      amount: ctx.input.amount,
      currency: ctx.input.currency,
      narration: ctx.input.narration,
      reference: ctx.input.reference,
      destinationBranchCode: ctx.input.destinationBranchCode,
      meta: ctx.input.meta,
      debitCurrency: ctx.input.debitCurrency,
      beneficiaryName: ctx.input.beneficiaryName
    });

    let t = result.data;

    return {
      output: {
        transferId: t.id,
        accountNumber: t.account_number,
        bankName: t.bank_name,
        fullName: t.full_name,
        amount: t.amount,
        currency: t.currency,
        fee: t.fee,
        status: t.status,
        reference: t.reference,
        narration: t.narration,
        requiresApproval:
          t.requires_approval === undefined
            ? undefined
            : t.requires_approval === 1 || t.requires_approval === true,
        createdAt: t.created_at
      },
      message: `Transfer of **${t.currency} ${t.amount}** to **${t.full_name || t.account_number}** request accepted. Completion must be checked using list_transfers with transferId. Provider status: **${t.status}**.`
    };
  })
  .build();
