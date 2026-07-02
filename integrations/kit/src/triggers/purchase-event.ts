import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let purchaseEvent = SlateTrigger.create(spec, {
  name: 'Purchase Event',
  key: 'purchase_event',
  description: 'Triggers when a new purchase record is created in Kit.'
})
  .input(
    z.object({
      eventName: z.string().describe('The Kit event name'),
      purchaseId: z.number().describe('Purchase ID'),
      transactionId: z.string().describe('Transaction ID'),
      emailAddress: z.string().describe('Buyer email address'),
      currency: z.string().describe('Currency code'),
      total: z.number().describe('Purchase total'),
      status: z.string().describe('Purchase status'),
      transactionTime: z.string().describe('When the transaction occurred'),
      rawPayload: z.record(z.string(), z.any()).describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      purchaseId: z.number().describe('Purchase ID'),
      transactionId: z.string().describe('Transaction ID'),
      emailAddress: z.string().describe('Buyer email address'),
      currency: z.string().describe('Currency code'),
      total: z.number().describe('Purchase total'),
      status: z.string().describe('Purchase status'),
      transactionTime: z.string().describe('When the transaction occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let purchase = data.purchase || {};

      return {
        inputs: [
          {
            eventName: data.event_name || data.name || 'purchase.purchase_create',
            purchaseId: purchase.id ?? 0,
            transactionId: purchase.transaction_id ?? '',
            emailAddress: purchase.email_address ?? data.subscriber?.email_address ?? '',
            currency: purchase.currency ?? 'USD',
            total: purchase.total ?? 0,
            status: purchase.status ?? '',
            transactionTime: purchase.transaction_time ?? new Date().toISOString(),
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'purchase.created',
        id: `purchase-${ctx.input.purchaseId}-${Date.now()}`,
        output: {
          purchaseId: ctx.input.purchaseId,
          transactionId: ctx.input.transactionId,
          emailAddress: ctx.input.emailAddress,
          currency: ctx.input.currency,
          total: ctx.input.total,
          status: ctx.input.status,
          transactionTime: ctx.input.transactionTime
        }
      };
    }
  })
  .build();
