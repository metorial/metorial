import { SlateTool } from 'slates';
import { z } from 'zod';
import { MxClient } from '../lib/client';
import { spec } from '../spec';

export let enhanceTransactions = SlateTool.create(spec, {
  name: 'Enhance Transactions',
  key: 'enhance_transactions',
  description: `Categorize, cleanse, and classify a batch of transactions using MX's Data Enhancement service. Submit raw transaction data and receive enhanced results with categories, cleaned descriptions, and merchant information. This service does **not** store data on the MX platform.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      transactions: z
        .array(
          z.object({
            transactionId: z.string().describe('Your unique identifier for this transaction'),
            description: z.string().optional().describe('Original transaction description'),
            amount: z.number().optional().describe('Transaction amount'),
            merchantCategoryCode: z
              .number()
              .optional()
              .describe('Merchant category code (MCC)'),
            type: z.string().optional().describe('Transaction type (CREDIT or DEBIT)')
          })
        )
        .describe('Array of transactions to enhance')
    })
  )
  .output(
    z.object({
      transactions: z.array(
        z.object({
          transactionId: z.string().optional().describe('Your unique identifier'),
          amount: z.number().optional().nullable(),
          category: z.string().optional().nullable().describe('MX-assigned category'),
          categoryGuid: z.string().optional().nullable(),
          description: z.string().optional().nullable().describe('Original description'),
          cleanedDescription: z
            .string()
            .optional()
            .nullable()
            .describe('MX-cleansed description'),
          extendedTransactionType: z.string().optional().nullable(),
          isExpense: z.boolean().optional().nullable(),
          isIncome: z.boolean().optional().nullable(),
          isBillPay: z.boolean().optional().nullable(),
          isSubscription: z.boolean().optional().nullable(),
          merchantGuid: z.string().optional().nullable(),
          merchantName: z.string().optional().nullable(),
          merchantCategoryCode: z.number().optional().nullable(),
          type: z.string().optional().nullable()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let enhanced = await client.enhanceTransactions(
      ctx.input.transactions.map(t => ({
        id: t.transactionId,
        description: t.description,
        amount: t.amount,
        merchantCategoryCode: t.merchantCategoryCode,
        type: t.type
      }))
    );

    let transactions = (enhanced || []).map((t: any) => ({
      transactionId: t.id,
      amount: t.amount,
      category: t.category,
      categoryGuid: t.category_guid,
      description: t.description,
      cleanedDescription: t.cleansed_description,
      extendedTransactionType: t.extended_transaction_type,
      isExpense: t.is_expense,
      isIncome: t.is_income,
      isBillPay: t.is_bill_pay,
      isSubscription: t.is_subscription,
      merchantGuid: t.merchant_guid,
      merchantName: t.merchant_name ?? t.merchant,
      merchantCategoryCode: t.merchant_category_code,
      type: t.type
    }));

    return {
      output: { transactions },
      message: `Enhanced **${transactions.length}** transactions with categories, cleaned descriptions, and merchant data.`
    };
  })
  .build();
