import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTransaction = SlateTool.create(spec, {
  name: 'Update Transaction',
  key: 'update_transaction',
  description: `Update an existing transaction by its ID. All fields are optional except transactionId — only provide the fields you want to change. For split transactions, provide the full set of subtransactions.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      budgetId: z
        .string()
        .optional()
        .describe('Budget ID. Defaults to the configured budget.'),
      transactionId: z.string().describe('ID of the transaction to update'),
      accountId: z.string().optional().describe('Updated account ID'),
      date: z.string().optional().describe('Updated date (YYYY-MM-DD)'),
      amount: z.number().optional().describe('Updated amount in milliunits'),
      payeeId: z.string().nullable().optional().describe('Updated payee ID'),
      payeeName: z.string().nullable().optional().describe('Updated payee name'),
      categoryId: z.string().nullable().optional().describe('Updated category ID'),
      memo: z.string().nullable().optional().describe('Updated memo'),
      cleared: z
        .enum(['cleared', 'uncleared', 'reconciled'])
        .optional()
        .describe('Updated cleared status'),
      approved: z.boolean().optional().describe('Updated approval status'),
      flagColor: z
        .enum(['red', 'orange', 'yellow', 'green', 'blue', 'purple'])
        .nullable()
        .optional()
        .describe('Updated flag color')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Updated transaction ID'),
      date: z.string().describe('Transaction date'),
      amount: z.number().describe('Amount in milliunits'),
      accountId: z.string().describe('Account ID'),
      payeeName: z.string().nullable().optional().describe('Payee name'),
      categoryName: z.string().nullable().optional().describe('Category name'),
      cleared: z.string().describe('Cleared status'),
      approved: z.boolean().describe('Approval status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let budgetId = ctx.input.budgetId ?? ctx.config.budgetId;

    let updateData: Record<string, any> = {};
    if (ctx.input.accountId !== undefined) updateData.account_id = ctx.input.accountId;
    if (ctx.input.date !== undefined) updateData.date = ctx.input.date;
    if (ctx.input.amount !== undefined) updateData.amount = ctx.input.amount;
    if (ctx.input.payeeId !== undefined) updateData.payee_id = ctx.input.payeeId;
    if (ctx.input.payeeName !== undefined) updateData.payee_name = ctx.input.payeeName;
    if (ctx.input.categoryId !== undefined) updateData.category_id = ctx.input.categoryId;
    if (ctx.input.memo !== undefined) updateData.memo = ctx.input.memo;
    if (ctx.input.cleared !== undefined) updateData.cleared = ctx.input.cleared;
    if (ctx.input.approved !== undefined) updateData.approved = ctx.input.approved;
    if (ctx.input.flagColor !== undefined) updateData.flag_color = ctx.input.flagColor;

    let t = await client.updateTransaction(budgetId, ctx.input.transactionId, updateData);

    return {
      output: {
        transactionId: t.id,
        date: t.date,
        amount: t.amount,
        accountId: t.account_id,
        payeeName: t.payee_name,
        categoryName: t.category_name,
        cleared: t.cleared,
        approved: t.approved
      },
      message: `Updated transaction **${t.id}** on ${t.date}`
    };
  })
  .build();
