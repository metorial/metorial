import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let holdingsWebhookTrigger = SlateTrigger.create(spec, {
  name: 'Investments Webhook',
  key: 'investments_webhook',
  description:
    'Receives webhook notifications when investment holdings or transaction data is updated or ready for retrieval.'
})
  .input(
    z.object({
      webhookType: z.string().describe('Webhook type (HOLDINGS or INVESTMENTS_TRANSACTIONS)'),
      webhookCode: z.string().describe('Webhook code (DEFAULT_UPDATE)'),
      itemId: z.string().describe('Plaid Item ID'),
      environment: z.string().optional().describe('Plaid environment'),
      error: z.any().nullable().optional().describe('Error details if applicable')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('Affected Item ID'),
      webhookType: z.string().describe('HOLDINGS or INVESTMENTS_TRANSACTIONS'),
      webhookCode: z.string().describe('Event code'),
      environment: z.string().optional().describe('Plaid environment'),
      hasError: z.boolean().describe('Whether the update resulted in an error')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (
        data.webhook_type !== 'HOLDINGS' &&
        data.webhook_type !== 'INVESTMENTS_TRANSACTIONS'
      ) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            webhookType: data.webhook_type,
            webhookCode: data.webhook_code,
            itemId: data.item_id,
            environment: data.environment,
            error: data.error ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typePrefix =
        ctx.input.webhookType === 'HOLDINGS' ? 'holdings' : 'investments_transactions';
      return {
        type: `${typePrefix}.${ctx.input.webhookCode.toLowerCase()}`,
        id: `${ctx.input.itemId}-${ctx.input.webhookType}-${ctx.input.webhookCode}-${Date.now()}`,
        output: {
          itemId: ctx.input.itemId,
          webhookType: ctx.input.webhookType,
          webhookCode: ctx.input.webhookCode,
          environment: ctx.input.environment,
          hasError: ctx.input.error != null
        }
      };
    }
  })
  .build();
