import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let transactionChanges = SlateTrigger.create(spec, {
  name: 'Transaction Changes',
  key: 'transaction_changes',
  description:
    'Polls for new, updated, or deleted transactions in a budget using delta requests.'
})
  .input(
    z.object({
      changeType: z
        .enum(['created', 'updated', 'deleted'])
        .describe('Type of change detected'),
      transactionId: z.string().describe('Transaction ID'),
      date: z.string().describe('Transaction date'),
      amount: z.number().describe('Amount in milliunits'),
      memo: z.string().nullable().optional().describe('Memo'),
      cleared: z.string().describe('Cleared status'),
      approved: z.boolean().describe('Whether approved'),
      accountId: z.string().describe('Account ID'),
      accountName: z.string().optional().describe('Account name'),
      payeeId: z.string().nullable().optional().describe('Payee ID'),
      payeeName: z.string().nullable().optional().describe('Payee name'),
      categoryId: z.string().nullable().optional().describe('Category ID'),
      categoryName: z.string().nullable().optional().describe('Category name'),
      deleted: z.boolean().describe('Whether deleted')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Transaction ID'),
      date: z.string().describe('Transaction date'),
      amount: z.number().describe('Amount in milliunits'),
      memo: z.string().nullable().optional().describe('Memo'),
      cleared: z.string().describe('Cleared status'),
      approved: z.boolean().describe('Whether approved'),
      accountId: z.string().describe('Account ID'),
      accountName: z.string().optional().describe('Account name'),
      payeeId: z.string().nullable().optional().describe('Payee ID'),
      payeeName: z.string().nullable().optional().describe('Payee name'),
      categoryId: z.string().nullable().optional().describe('Category ID'),
      categoryName: z.string().nullable().optional().describe('Category name')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let budgetId = ctx.config.budgetId;

      let lastKnowledge = ctx.state?.serverKnowledge as number | undefined;
      let previousIds = (ctx.state?.knownTransactionIds as string[] | undefined) ?? [];

      let result = await client.getTransactions(budgetId, {
        lastKnowledge
      });

      let inputs = result.transactions.map((t: any) => {
        let isDeleted = t.deleted === true;
        let isKnown = previousIds.includes(t.id);
        let changeType: 'created' | 'updated' | 'deleted' = isDeleted
          ? 'deleted'
          : isKnown
            ? 'updated'
            : 'created';

        return {
          changeType,
          transactionId: t.id,
          date: t.date,
          amount: t.amount,
          memo: t.memo,
          cleared: t.cleared,
          approved: t.approved,
          accountId: t.account_id,
          accountName: t.account_name,
          payeeId: t.payee_id,
          payeeName: t.payee_name,
          categoryId: t.category_id,
          categoryName: t.category_name,
          deleted: t.deleted
        };
      });

      // Track IDs: add new ones, remove deleted ones
      let newIds = new Set(previousIds);
      for (let input of inputs) {
        if (input.deleted) {
          newIds.delete(input.transactionId);
        } else {
          newIds.add(input.transactionId);
        }
      }

      return {
        inputs,
        updatedState: {
          serverKnowledge: result.serverKnowledge,
          knownTransactionIds: Array.from(newIds)
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `transaction.${ctx.input.changeType}`,
        id: `${ctx.input.transactionId}-${ctx.input.changeType}`,
        output: {
          transactionId: ctx.input.transactionId,
          date: ctx.input.date,
          amount: ctx.input.amount,
          memo: ctx.input.memo,
          cleared: ctx.input.cleared,
          approved: ctx.input.approved,
          accountId: ctx.input.accountId,
          accountName: ctx.input.accountName,
          payeeId: ctx.input.payeeId,
          payeeName: ctx.input.payeeName,
          categoryId: ctx.input.categoryId,
          categoryName: ctx.input.categoryName
        }
      };
    }
  })
  .build();
