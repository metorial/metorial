import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let transactionEvents = SlateTrigger.create(spec, {
  name: 'Transaction Events',
  key: 'transaction_events',
  description:
    'Polls for new and updated Ramp card transactions. Detects new transactions created since the last poll.'
})
  .input(
    z.object({
      transactionId: z.string().describe('Unique ID of the transaction'),
      transaction: z.any().describe('Full transaction object from Ramp')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Unique ID of the transaction'),
      amount: z.number().optional().describe('Transaction amount'),
      currency: z.string().optional().describe('Transaction currency code'),
      merchantName: z.string().optional().describe('Merchant name'),
      merchantId: z.string().optional().describe('Merchant ID'),
      cardId: z.string().optional().describe('Card ID used for the transaction'),
      userId: z.string().optional().describe('User ID of the cardholder'),
      userFullName: z.string().optional().describe('Full name of the cardholder'),
      state: z.string().optional().describe('Transaction state'),
      memo: z.string().optional().describe('Transaction memo'),
      categoryName: z.string().optional().describe('Merchant category name'),
      transactionTime: z.string().optional().describe('Time of the transaction (ISO 8601)')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        environment: ctx.config.environment
      });

      let lastPollTime = ctx.state?.lastPollTime;
      let result = await client.listTransactions({
        fromDate: lastPollTime,
        pageSize: 100
      });

      let now = new Date().toISOString();

      return {
        inputs: result.data.map((transaction: any) => ({
          transactionId: transaction.id,
          transaction
        })),
        updatedState: {
          lastPollTime: now
        }
      };
    },
    handleEvent: async ctx => {
      let t = ctx.input.transaction;
      return {
        type: 'transaction.created',
        id: ctx.input.transactionId,
        output: {
          transactionId: t.id,
          amount: t.amount,
          currency: t.currency,
          merchantName: t.merchant_name,
          merchantId: t.merchant_id,
          cardId: t.card_id,
          userId: t.card_holder?.user_id,
          userFullName: t.card_holder
            ? `${t.card_holder.first_name || ''} ${t.card_holder.last_name || ''}`.trim()
            : undefined,
          state: t.state,
          memo: t.memo,
          categoryName: t.sk_category_name,
          transactionTime: t.user_transaction_time
        }
      };
    }
  })
  .build();
