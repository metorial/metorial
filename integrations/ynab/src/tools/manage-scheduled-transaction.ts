import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let frequencyEnum = z.enum([
  'never',
  'daily',
  'weekly',
  'everyOtherWeek',
  'twiceAMonth',
  'every4Weeks',
  'monthly',
  'everyOtherMonth',
  'everyThreeMonths',
  'everyFourMonths',
  'twiceAYear',
  'yearly',
  'everyOtherYear'
]);

export let manageScheduledTransaction = SlateTool.create(spec, {
  name: 'Manage Scheduled Transaction',
  key: 'manage_scheduled_transaction',
  description: `Create, update, or delete a scheduled (recurring) transaction. When creating, provide accountId, date, amount, and frequency. When updating, provide scheduledTransactionId and the fields to change. When deleting, provide scheduledTransactionId and set action to "delete".`,
  constraints: [
    'Scheduled transaction dates must be in the future and no more than 5 years out',
    'Amounts are in milliunits'
  ],
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
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      scheduledTransactionId: z
        .string()
        .optional()
        .describe('Required for update/delete actions'),
      accountId: z.string().optional().describe('Account ID (required for create)'),
      date: z
        .string()
        .optional()
        .describe('Date for the scheduled transaction (YYYY-MM-DD, must be future)'),
      amount: z.number().optional().describe('Amount in milliunits'),
      frequency: frequencyEnum.optional().describe('Recurrence frequency'),
      payeeId: z.string().nullable().optional().describe('Payee ID'),
      payeeName: z.string().nullable().optional().describe('Payee name'),
      categoryId: z.string().nullable().optional().describe('Category ID'),
      memo: z.string().nullable().optional().describe('Memo'),
      flagColor: z
        .enum(['red', 'orange', 'yellow', 'green', 'blue', 'purple'])
        .nullable()
        .optional()
        .describe('Flag color')
    })
  )
  .output(
    z.object({
      scheduledTransactionId: z.string().describe('ID of the scheduled transaction'),
      dateFirst: z.string().optional().describe('First occurrence date'),
      dateNext: z.string().optional().describe('Next occurrence date'),
      frequency: z.string().optional().describe('Recurrence frequency'),
      amount: z.number().optional().describe('Amount in milliunits'),
      accountId: z.string().optional().describe('Account ID'),
      deleted: z.boolean().optional().describe('Whether deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let budgetId = ctx.input.budgetId ?? ctx.config.budgetId;
    let action = ctx.input.action;

    if (action === 'delete') {
      if (!ctx.input.scheduledTransactionId) {
        throw new Error('scheduledTransactionId is required for delete action');
      }
      let st = await client.deleteScheduledTransaction(
        budgetId,
        ctx.input.scheduledTransactionId
      );
      return {
        output: {
          scheduledTransactionId: st.id,
          deleted: st.deleted
        },
        message: `Deleted scheduled transaction **${st.id}**`
      };
    }

    let data: Record<string, any> = {};
    if (ctx.input.accountId !== undefined) data.account_id = ctx.input.accountId;
    if (ctx.input.date !== undefined) data.date = ctx.input.date;
    if (ctx.input.amount !== undefined) data.amount = ctx.input.amount;
    if (ctx.input.frequency !== undefined) data.frequency = ctx.input.frequency;
    if (ctx.input.payeeId !== undefined) data.payee_id = ctx.input.payeeId;
    if (ctx.input.payeeName !== undefined) data.payee_name = ctx.input.payeeName;
    if (ctx.input.categoryId !== undefined) data.category_id = ctx.input.categoryId;
    if (ctx.input.memo !== undefined) data.memo = ctx.input.memo;
    if (ctx.input.flagColor !== undefined) data.flag_color = ctx.input.flagColor;

    let st: any;
    if (action === 'create') {
      st = await client.createScheduledTransaction(budgetId, data);
    } else {
      if (!ctx.input.scheduledTransactionId) {
        throw new Error('scheduledTransactionId is required for update action');
      }
      st = await client.updateScheduledTransaction(
        budgetId,
        ctx.input.scheduledTransactionId,
        data
      );
    }

    return {
      output: {
        scheduledTransactionId: st.id,
        dateFirst: st.date_first,
        dateNext: st.date_next,
        frequency: st.frequency,
        amount: st.amount,
        accountId: st.account_id,
        deleted: st.deleted
      },
      message: `${action === 'create' ? 'Created' : 'Updated'} scheduled transaction **${st.id}**`
    };
  })
  .build();
