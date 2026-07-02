import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let transactionEvents = SlateTrigger.create(spec, {
  name: 'Transaction Events',
  key: 'transaction_events',
  description: 'Triggered when new or updated transactions are available for a user.'
})
  .input(
    z.object({
      action: z.string().describe('Event action (created, updated, deleted)'),
      userGuid: z.string().describe('GUID of the user'),
      transactionGuid: z.string().describe('GUID of the transaction'),
      payload: z.any().optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      userGuid: z.string().describe('GUID of the user'),
      transactionGuid: z.string().describe('GUID of the transaction'),
      accountGuid: z.string().optional().nullable().describe('GUID of the account'),
      memberGuid: z.string().optional().nullable().describe('GUID of the member'),
      amount: z.number().optional().nullable().describe('Transaction amount'),
      description: z.string().optional().nullable().describe('Transaction description'),
      category: z.string().optional().nullable().describe('Transaction category'),
      date: z.string().optional().nullable().describe('Transaction date'),
      type: z.string().optional().nullable().describe('Transaction type (CREDIT/DEBIT)'),
      status: z.string().optional().nullable().describe('Transaction status (POSTED/PENDING)'),
      version: z.number().optional().nullable().describe('Object version for change detection')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let action = data.action || 'created';

      return {
        inputs: [
          {
            action,
            userGuid: data.user_guid || data.transaction?.user_guid || '',
            transactionGuid: data.transaction_guid || data.transaction?.guid || '',
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let txn = ctx.input.payload?.transaction || {};

      return {
        type: `transaction.${ctx.input.action}`,
        id: `${ctx.input.transactionGuid}-${ctx.input.action}-${txn.version || Date.now()}`,
        output: {
          userGuid: ctx.input.userGuid,
          transactionGuid: ctx.input.transactionGuid,
          accountGuid: txn.account_guid,
          memberGuid: txn.member_guid,
          amount: txn.amount,
          description: txn.cleansed_description || txn.description,
          category: txn.category,
          date: txn.date,
          type: txn.type,
          status: txn.status,
          version: txn.version
        }
      };
    }
  })
  .build();
