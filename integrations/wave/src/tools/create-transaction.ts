import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { WaveClient } from '../lib/client';
import { spec } from '../spec';

export let createTransaction = SlateTool.create(spec, {
  name: 'Create Transaction',
  key: 'create_transaction',
  tags: { readOnly: false, destructive: true },
  description: `Record a retained accounting entry in Wave; this does not initiate a bank transfer or payment. This is equivalent to creating a standard transaction in Wave where a deposit or withdrawal to/from a bank or credit card account is categorized to one or more accounting categories.

Use **DEPOSIT** when the business receives money and **WITHDRAWAL** when the business spends money. Line items categorize the transaction using **INCREASE** or **DECREASE** balance directions. Line items and taxes must balance the anchor according to their accounting directions.`,
  instructions: [
    'The anchor account must be a bank or credit card account (asset or liability type).',
    'All amounts should be positive with up to 2 decimal places.',
    'DEPOSIT = receiving money, WITHDRAWAL = spending money.',
    'Line item balances: INCREASE or DECREASE are recommended over DEBIT/CREDIT for simplicity.',
    'Line items and taxes must balance the anchor according to their accounting directions; consult the Wave transaction guide.'
  ],
  constraints: [
    'Transfers between bank/credit card accounts are not supported via the API.',
    'Requires a business with non-classic accounting. The public API cannot read, edit or delete these entries; no automatic retry or reversal is provided.'
  ]
})
  .scopes(anyOf('transaction:write'))
  .input(
    z.object({
      businessId: z
        .string()
        .describe(
          'ID of the business to create the transaction for. Call list_businesses to discover a permitted business ID.'
        ),
      externalId: z
        .string()
        .describe(
          'External reference for the retained accounting entry. Duplicate prevention is not guaranteed; do not retry an uncertain result.'
        ),
      date: z.string().describe('Transaction date (YYYY-MM-DD)'),
      description: z
        .string()
        .optional()
        .describe('Description required by Wave; the legacy optional field must be supplied.'),
      notes: z.string().optional().describe('Additional notes'),
      anchor: z
        .object({
          accountId: z.string().describe('ID of the anchor bank or credit card account'),
          amount: z.number().describe('Transaction amount (positive value)'),
          direction: z
            .enum(['DEPOSIT', 'WITHDRAWAL'])
            .describe('DEPOSIT = receiving money, WITHDRAWAL = spending money')
        })
        .describe('The bank/credit card account and direction of the transaction'),
      lineItems: z
        .array(
          z.object({
            accountId: z
              .string()
              .describe('ID of the categorization account (e.g., income or expense account)'),
            amount: z.number().describe('Line item amount (positive value)'),
            balance: z
              .enum(['INCREASE', 'DECREASE', 'DEBIT', 'CREDIT'])
              .describe('Balance direction: INCREASE or DECREASE are recommended'),
            taxes: z
              .array(
                z.object({
                  salesTaxId: z.string().describe('ID of the sales tax to apply'),
                  amount: z
                    .number()
                    .optional()
                    .describe(
                      'Explicit nonnegative tax amount required whenever a tax is supplied; use the accounting currency and at most two decimal places.'
                    )
                })
              )
              .optional()
              .describe('Sales taxes to apply to this line item')
          })
        )
        .describe('Categorization line items (must balance with anchor amount)')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('ID of the created transaction'),
      success: z.boolean().describe('Whether the transaction was created successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    let result = await client.createMoneyTransaction(ctx.input);

    return {
      output: {
        transactionId: result.data.id,
        success: true
      },
      message: `Created transaction \`${result.data.id}\` on ${ctx.input.date} for ${ctx.input.anchor.direction} of ${ctx.input.anchor.amount} in the anchor account currency.`
    };
  })
  .build();
