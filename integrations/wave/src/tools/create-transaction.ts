import { SlateTool } from 'slates';
import { z } from 'zod';
import { WaveClient } from '../lib/client';
import { spec } from '../spec';

export let createTransaction = SlateTool.create(spec, {
  name: 'Create Transaction',
  key: 'create_transaction',
  description: `Create a financial transaction in Wave. This is equivalent to creating a standard transaction in Wave where a deposit or withdrawal to/from a bank or credit card account is categorized to one or more accounting categories.

Use **DEPOSIT** when the business receives money and **WITHDRAWAL** when the business spends money. Line items categorize the transaction using **INCREASE** or **DECREASE** balance directions. The total of line item amounts must equal the anchor amount.`,
  instructions: [
    'The anchor account must be a bank or credit card account (asset or liability type).',
    'All amounts should be positive with up to 2 decimal places.',
    'DEPOSIT = receiving money, WITHDRAWAL = spending money.',
    'Line item balances: INCREASE or DECREASE are recommended over DEBIT/CREDIT for simplicity.',
    'The sum of all line item amounts must equal the anchor amount.'
  ],
  constraints: [
    'Transfers between bank/credit card accounts are not supported via the API.',
    'The API only supports creating transactions, not querying or editing existing ones.'
  ]
})
  .input(
    z.object({
      businessId: z.string().describe('ID of the business to create the transaction for'),
      externalId: z
        .string()
        .describe(
          'A unique external reference ID for this transaction (used for idempotency)'
        ),
      date: z.string().describe('Transaction date (YYYY-MM-DD)'),
      description: z.string().optional().describe('Transaction description'),
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
                  salesTaxId: z.string().describe('ID of the sales tax to apply')
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

    if (!result.didSucceed) {
      throw new Error(
        `Failed to create transaction: ${result.inputErrors.map(e => e.message).join(', ')}`
      );
    }

    return {
      output: {
        transactionId: result.data.id,
        success: true
      },
      message: `Created transaction \`${result.data.id}\` on ${ctx.input.date} for ${ctx.input.anchor.direction} of $${ctx.input.anchor.amount}.`
    };
  })
  .build();
