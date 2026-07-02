import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let transactionEvents = SlateTrigger.create(spec, {
  name: 'Transaction Events',
  key: 'transaction_events',
  description:
    'Triggers when a payment transaction is successfully completed. Covers one-time charges, subscription renewals, and bulk charges.'
})
  .input(
    z.object({
      eventType: z.string().describe('Paystack event type'),
      eventId: z.string().describe('Unique event identifier for deduplication'),
      transactionId: z.number().describe('Transaction ID'),
      reference: z.string().describe('Transaction reference'),
      status: z.string().describe('Transaction status'),
      amount: z.number().describe('Amount in smallest currency unit'),
      currency: z.string().describe('Currency code'),
      channel: z.string().describe('Payment channel used'),
      customerEmail: z.string().describe('Customer email'),
      customerCode: z.string().describe('Customer code'),
      paidAt: z.string().nullable().describe('Payment timestamp'),
      gatewayResponse: z.string().describe('Gateway response'),
      metadata: z.any().optional().describe('Transaction metadata')
    })
  )
  .output(
    z.object({
      transactionId: z.number().describe('Transaction ID'),
      reference: z.string().describe('Transaction reference'),
      status: z.string().describe('Transaction status'),
      amount: z.number().describe('Amount in smallest currency unit'),
      currency: z.string().describe('Currency code'),
      channel: z.string().describe('Payment channel'),
      customerEmail: z.string().describe('Customer email'),
      customerCode: z.string().describe('Customer code'),
      paidAt: z.string().nullable().describe('Payment timestamp'),
      gatewayResponse: z.string().describe('Gateway response'),
      metadata: z.any().optional().describe('Transaction metadata')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.input.request.json()) as any;
      let event = body.event as string;

      if (event !== 'charge.success') {
        return { inputs: [] };
      }

      let tx = body.data;

      return {
        inputs: [
          {
            eventType: event,
            eventId: `${event}_${tx.id}_${tx.reference}`,
            transactionId: tx.id,
            reference: tx.reference,
            status: tx.status,
            amount: tx.amount,
            currency: tx.currency,
            channel: tx.channel,
            customerEmail: tx.customer?.email ?? '',
            customerCode: tx.customer?.customer_code ?? '',
            paidAt: tx.paid_at ?? null,
            gatewayResponse: tx.gateway_response,
            metadata: tx.metadata
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'transaction.successful',
        id: ctx.input.eventId,
        output: {
          transactionId: ctx.input.transactionId,
          reference: ctx.input.reference,
          status: ctx.input.status,
          amount: ctx.input.amount,
          currency: ctx.input.currency,
          channel: ctx.input.channel,
          customerEmail: ctx.input.customerEmail,
          customerCode: ctx.input.customerCode,
          paidAt: ctx.input.paidAt,
          gatewayResponse: ctx.input.gatewayResponse,
          metadata: ctx.input.metadata
        }
      };
    }
  })
  .build();
