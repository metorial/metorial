import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let chargeCompleted = SlateTrigger.create(spec, {
  name: 'Charge Completed',
  key: 'charge_completed',
  description:
    'Triggered when a payment charge is completed (successful or failed), regardless of payment method (card, bank transfer, mobile money, USSD, etc.).'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type from webhook'),
      transactionId: z.number().describe('Flutterwave transaction ID'),
      txRef: z.string().describe('Your unique transaction reference'),
      flwRef: z.string().describe('Flutterwave reference'),
      amount: z.number().describe('Transaction amount'),
      currency: z.string().describe('Transaction currency'),
      chargedAmount: z.number().describe('Amount charged to customer'),
      appFee: z.number().optional().describe('Application/processing fee'),
      merchantFee: z.number().optional().describe('Merchant fee'),
      status: z.string().describe('Transaction status (successful, failed)'),
      paymentType: z.string().optional().describe('Payment method used'),
      customerEmail: z.string().optional().describe('Customer email'),
      customerName: z.string().optional().describe('Customer name'),
      customerPhone: z.string().optional().describe('Customer phone number'),
      cardFirst6: z.string().optional().describe('First 6 digits of card'),
      cardLast4: z.string().optional().describe('Last 4 digits of card'),
      cardType: z.string().optional().describe('Card brand'),
      cardToken: z.string().optional().describe('Card token for tokenized charges'),
      createdAt: z.string().optional().describe('Transaction timestamp')
    })
  )
  .output(
    z.object({
      transactionId: z.number().describe('Flutterwave transaction ID'),
      txRef: z.string().describe('Your unique transaction reference'),
      flwRef: z.string().describe('Flutterwave reference'),
      amount: z.number().describe('Transaction amount'),
      currency: z.string().describe('Transaction currency'),
      chargedAmount: z.number().describe('Amount charged to customer'),
      appFee: z.number().optional().describe('Application/processing fee'),
      merchantFee: z.number().optional().describe('Merchant fee'),
      status: z.string().describe('Transaction status'),
      paymentType: z.string().optional().describe('Payment method used'),
      customerEmail: z.string().optional().describe('Customer email'),
      customerName: z.string().optional().describe('Customer name'),
      customerPhone: z.string().optional().describe('Customer phone number'),
      cardFirst6: z.string().optional().describe('First 6 digits of card'),
      cardLast4: z.string().optional().describe('Last 4 digits of card'),
      cardType: z.string().optional().describe('Card brand'),
      cardToken: z.string().optional().describe('Card token for tokenized charges'),
      createdAt: z.string().optional().describe('Transaction timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      if (body.event !== 'charge.completed') {
        return { inputs: [] };
      }

      let d = body.data || {};

      return {
        inputs: [
          {
            eventType: body.event,
            transactionId: d.id,
            txRef: d.tx_ref,
            flwRef: d.flw_ref,
            amount: d.amount,
            currency: d.currency,
            chargedAmount: d.charged_amount,
            appFee: d.app_fee,
            merchantFee: d.merchant_fee,
            status: d.status,
            paymentType: d.payment_type,
            customerEmail: d.customer?.email,
            customerName: d.customer?.name,
            customerPhone: d.customer?.phone_number,
            cardFirst6: d.card?.first_6digits,
            cardLast4: d.card?.last_4digits,
            cardType: d.card?.type,
            cardToken: d.card?.token,
            createdAt: d.created_at
          }
        ]
      };
    },
    handleEvent: async ctx => {
      return {
        type: 'charge.completed',
        id: `charge_${ctx.input.transactionId}`,
        output: {
          transactionId: ctx.input.transactionId,
          txRef: ctx.input.txRef,
          flwRef: ctx.input.flwRef,
          amount: ctx.input.amount,
          currency: ctx.input.currency,
          chargedAmount: ctx.input.chargedAmount,
          appFee: ctx.input.appFee,
          merchantFee: ctx.input.merchantFee,
          status: ctx.input.status,
          paymentType: ctx.input.paymentType,
          customerEmail: ctx.input.customerEmail,
          customerName: ctx.input.customerName,
          customerPhone: ctx.input.customerPhone,
          cardFirst6: ctx.input.cardFirst6,
          cardLast4: ctx.input.cardLast4,
          cardType: ctx.input.cardType,
          cardToken: ctx.input.cardToken,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
