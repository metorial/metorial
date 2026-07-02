import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let transactionsWebhookTrigger = SlateTrigger.create(spec, {
  name: 'Transactions Webhook',
  key: 'transactions_webhook',
  description:
    'Receives webhook notifications about transaction updates, including sync updates available, initial/historical data readiness, default updates, and removed transactions.'
})
  .input(
    z.object({
      webhookType: z.string().describe('Webhook type (TRANSACTIONS)'),
      webhookCode: z.string().describe('Webhook code'),
      itemId: z.string().describe('Plaid Item ID'),
      newTransactions: z
        .number()
        .optional()
        .describe('Number of new transactions (legacy webhooks)'),
      removedTransactions: z.array(z.string()).optional().describe('Removed transaction IDs'),
      initialUpdateComplete: z
        .boolean()
        .optional()
        .describe('Whether initial update is complete'),
      historicalUpdateComplete: z
        .boolean()
        .optional()
        .describe('Whether historical update is complete'),
      environment: z.string().optional().describe('Plaid environment')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('Affected Item ID'),
      webhookCode: z
        .string()
        .describe(
          'Event code: SYNC_UPDATES_AVAILABLE, DEFAULT_UPDATE, INITIAL_UPDATE, HISTORICAL_UPDATE, TRANSACTIONS_REMOVED'
        ),
      newTransactions: z.number().nullable().optional().describe('Count of new transactions'),
      removedTransactionIds: z
        .array(z.string())
        .optional()
        .describe('List of removed transaction IDs'),
      initialUpdateComplete: z
        .boolean()
        .nullable()
        .optional()
        .describe('Whether initial update is complete'),
      historicalUpdateComplete: z
        .boolean()
        .nullable()
        .optional()
        .describe('Whether historical update is complete'),
      environment: z.string().optional().describe('Plaid environment')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (data.webhook_type !== 'TRANSACTIONS') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            webhookType: data.webhook_type,
            webhookCode: data.webhook_code,
            itemId: data.item_id,
            newTransactions: data.new_transactions,
            removedTransactions: data.removed_transactions,
            initialUpdateComplete: data.initial_update_complete,
            historicalUpdateComplete: data.historical_update_complete,
            environment: data.environment
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `transactions.${ctx.input.webhookCode.toLowerCase()}`,
        id: `${ctx.input.itemId}-${ctx.input.webhookCode}-${Date.now()}`,
        output: {
          itemId: ctx.input.itemId,
          webhookCode: ctx.input.webhookCode,
          newTransactions: ctx.input.newTransactions ?? null,
          removedTransactionIds: ctx.input.removedTransactions ?? [],
          initialUpdateComplete: ctx.input.initialUpdateComplete ?? null,
          historicalUpdateComplete: ctx.input.historicalUpdateComplete ?? null,
          environment: ctx.input.environment
        }
      };
    }
  })
  .build();
