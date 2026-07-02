import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let scheduledTransactionSchema = z.object({
  scheduledTransactionId: z.string().describe('Unique identifier'),
  dateFirst: z.string().optional().describe('First occurrence date'),
  dateNext: z.string().optional().describe('Next occurrence date'),
  frequency: z.string().optional().describe('Recurrence frequency'),
  amount: z.number().describe('Amount in milliunits'),
  memo: z.string().nullable().optional().describe('Memo'),
  flagColor: z.string().nullable().optional().describe('Flag color'),
  accountId: z.string().describe('Account ID'),
  accountName: z.string().optional().describe('Account name'),
  payeeId: z.string().nullable().optional().describe('Payee ID'),
  payeeName: z.string().nullable().optional().describe('Payee name'),
  categoryId: z.string().nullable().optional().describe('Category ID'),
  categoryName: z.string().nullable().optional().describe('Category name'),
  transferAccountId: z.string().nullable().optional().describe('Transfer account ID'),
  deleted: z.boolean().describe('Whether deleted')
});

export let listScheduledTransactions = SlateTool.create(spec, {
  name: 'List Scheduled Transactions',
  key: 'list_scheduled_transactions',
  description: `Retrieve all scheduled (recurring) transactions in a budget. Includes frequency, next occurrence date, and transaction details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      budgetId: z.string().optional().describe('Budget ID. Defaults to the configured budget.')
    })
  )
  .output(
    z.object({
      scheduledTransactions: z
        .array(scheduledTransactionSchema)
        .describe('List of scheduled transactions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let budgetId = ctx.input.budgetId ?? ctx.config.budgetId;

    let { scheduledTransactions } = await client.getScheduledTransactions(budgetId);

    let mapped = scheduledTransactions.map((st: any) => ({
      scheduledTransactionId: st.id,
      dateFirst: st.date_first,
      dateNext: st.date_next,
      frequency: st.frequency,
      amount: st.amount,
      memo: st.memo,
      flagColor: st.flag_color,
      accountId: st.account_id,
      accountName: st.account_name,
      payeeId: st.payee_id,
      payeeName: st.payee_name,
      categoryId: st.category_id,
      categoryName: st.category_name,
      transferAccountId: st.transfer_account_id,
      deleted: st.deleted
    }));

    return {
      output: { scheduledTransactions: mapped },
      message: `Found **${mapped.length}** scheduled transaction(s)`
    };
  })
  .build();
