import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let paymentEvents = SlateTrigger.create(spec, {
  name: 'Payment Events',
  key: 'payment_events',
  description:
    "Triggered when an affiliate's balance is settled (payment created). Configure the webhook URL in the Tapfiliate dashboard under Settings > Trigger emails & webhooks."
})
  .input(
    z.object({
      eventType: z.string().describe('Type of payment event'),
      paymentId: z.string().describe('ID of the payment'),
      payment: z.any().describe('Full payment data from the webhook payload')
    })
  )
  .output(
    z.object({
      paymentId: z.string().describe('Unique payment identifier'),
      affiliateId: z
        .string()
        .optional()
        .describe('ID of the affiliate who received the payment'),
      amount: z.number().optional().describe('Payment amount'),
      currency: z.string().optional().describe('Currency code'),
      createdAt: z.string().optional().describe('Payment creation timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let payment = data.payment || data;

      return {
        inputs: [
          {
            eventType: 'payment.created',
            paymentId: String(payment.id || data.id),
            payment
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payment = ctx.input.payment || {};

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${ctx.input.paymentId}`,
        output: {
          paymentId: ctx.input.paymentId,
          affiliateId: payment.affiliate?.id || payment.affiliate_id,
          amount: payment.amount,
          currency: payment.currency,
          createdAt: payment.created_at
        }
      };
    }
  })
  .build();
