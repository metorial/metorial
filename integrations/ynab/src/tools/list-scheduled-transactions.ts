import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapScheduled } from '../lib/models';
import { budgetInput, deltaInput, milliunits } from '../lib/validation';
import { spec } from '../spec';

let scheduledTransactionSchema = z.object({
  scheduledTransactionId: z.string().describe('Unique identifier'),
  dateFirst: z.string().optional().describe('First occurrence date'),
  dateNext: z.string().optional().describe('Next occurrence date'),
  frequency: z.string().optional().describe('Recurrence frequency'),
  amount: milliunits.describe('Amount in milliunits'),
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
      lastKnowledgeOfServer: deltaInput,
      budgetId: budgetInput
    })
  )
  .output(
    z.object({
      serverKnowledge: milliunits
        .nonnegative()
        .optional()
        .describe('Knowledge returned by this endpoint for subsequent delta requests.'),
      scheduledTransactions: z
        .array(scheduledTransactionSchema)
        .describe('List of scheduled transactions')
    })
  )
  .handleInvocation(async ctx => {
    const data = await new Client({ token: ctx.auth.token }).getScheduledTransactions(
      ctx.input.budgetId ?? ctx.config.budgetId,
      ctx.input.lastKnowledgeOfServer
    );
    return {
      output: {
        scheduledTransactions: data.scheduledTransactions.map(mapScheduled),
        serverKnowledge: data.serverKnowledge
      },
      message: `Returned ${data.scheduledTransactions.length} scheduled transaction record(s).`
    };
  })
  .build();
