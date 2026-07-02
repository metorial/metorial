import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let transferWebhookTrigger = SlateTrigger.create(spec, {
  name: 'Transfer Webhook',
  key: 'transfer_webhook',
  description:
    'Receives webhook notifications when new transfer events are available. After receiving this webhook, fetch new events via the transfer event sync endpoint.'
})
  .input(
    z.object({
      webhookType: z.string().describe('Webhook type (TRANSFER)'),
      webhookCode: z.string().describe('Webhook code (TRANSFER_EVENTS_UPDATE)'),
      environment: z.string().optional().describe('Plaid environment')
    })
  )
  .output(
    z.object({
      webhookCode: z.string().describe('Event code: TRANSFER_EVENTS_UPDATE'),
      environment: z.string().optional().describe('Plaid environment')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (data.webhook_type !== 'TRANSFER') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            webhookType: data.webhook_type,
            webhookCode: data.webhook_code,
            environment: data.environment
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `transfer.${ctx.input.webhookCode.toLowerCase()}`,
        id: `transfer-${ctx.input.webhookCode}-${Date.now()}`,
        output: {
          webhookCode: ctx.input.webhookCode,
          environment: ctx.input.environment
        }
      };
    }
  })
  .build();
