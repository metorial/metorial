import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let refundEvents = SlateTrigger.create(spec, {
  name: 'Refund Events',
  key: 'refund_events',
  description:
    'Triggers on refund lifecycle events: pending, processing, processed, or failed.'
})
  .input(
    z.object({
      eventType: z.string().describe('Paystack event type'),
      eventId: z.string().describe('Unique event identifier'),
      refundId: z.number().describe('Refund ID'),
      amount: z.number().describe('Refund amount'),
      currency: z.string().describe('Currency'),
      status: z.string().describe('Refund status'),
      transactionReference: z.string().describe('Original transaction reference'),
      customerNote: z.string().nullable().describe('Customer note'),
      merchantNote: z.string().nullable().describe('Merchant note')
    })
  )
  .output(
    z.object({
      refundId: z.number().describe('Refund ID'),
      amount: z.number().describe('Refund amount'),
      currency: z.string().describe('Currency'),
      status: z.string().describe('Refund status'),
      transactionReference: z.string().describe('Original transaction reference'),
      customerNote: z.string().nullable().describe('Customer note'),
      merchantNote: z.string().nullable().describe('Merchant note')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.input.request.json()) as any;
      let event = body.event as string;

      if (!event.startsWith('refund.')) {
        return { inputs: [] };
      }

      let refund = body.data;

      return {
        inputs: [
          {
            eventType: event,
            eventId: `${event}_${refund.id}_${Date.now()}`,
            refundId: refund.id,
            amount: refund.amount ?? 0,
            currency: refund.currency ?? '',
            status: refund.status ?? '',
            transactionReference: refund.transaction?.reference ?? '',
            customerNote: refund.customer_note ?? null,
            merchantNote: refund.merchant_note ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        'refund.pending': 'refund.pending',
        'refund.processing': 'refund.processing',
        'refund.processed': 'refund.processed',
        'refund.failed': 'refund.failed'
      };

      return {
        type: typeMap[ctx.input.eventType] ?? `refund.${ctx.input.status}`,
        id: ctx.input.eventId,
        output: {
          refundId: ctx.input.refundId,
          amount: ctx.input.amount,
          currency: ctx.input.currency,
          status: ctx.input.status,
          transactionReference: ctx.input.transactionReference,
          customerNote: ctx.input.customerNote,
          merchantNote: ctx.input.merchantNote
        }
      };
    }
  })
  .build();
