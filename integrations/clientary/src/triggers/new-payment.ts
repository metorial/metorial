import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newPaymentTrigger = SlateTrigger.create(spec, {
  name: 'New Payment',
  key: 'new_payment',
  description:
    'Triggers when a new payment is recorded in Clientary. Polls for recently created payments.'
})
  .input(
    z.object({
      paymentId: z.number().describe('ID of the payment'),
      invoiceId: z.number().optional().describe('Associated invoice ID'),
      amount: z.number().describe('Payment amount'),
      note: z.string().optional().describe('Payment note'),
      receivedOn: z.string().optional().describe('Date received'),
      transactionId: z.string().optional().describe('Gateway transaction ID'),
      transactionFee: z.number().optional().describe('Transaction fee'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .output(
    z.object({
      paymentId: z.number().describe('ID of the payment'),
      invoiceId: z.number().optional().describe('Associated invoice ID'),
      amount: z.number().describe('Payment amount'),
      note: z.string().optional().describe('Payment note'),
      receivedOn: z.string().optional().describe('Date payment was received'),
      transactionId: z
        .string()
        .optional()
        .describe('Gateway transaction ID (e.g. from Stripe)'),
      transactionFee: z.number().optional().describe('Transaction fee charged by gateway'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

      let result = await client.listPayments({ sort: 'created_at' });
      let payments = result.payments || [];

      let lastSeenId = ctx.state?.lastSeenId as number | undefined;

      let newPayments = lastSeenId ? payments.filter((p: any) => p.id > lastSeenId) : payments;

      let inputs = newPayments.map((p: any) => ({
        paymentId: p.id,
        invoiceId: p.invoice_id,
        amount: p.amount,
        note: p.note,
        receivedOn: p.received_on,
        transactionId: p.transaction_id,
        transactionFee: p.transaction_fee,
        createdAt: p.created_at
      }));

      let maxId =
        payments.length > 0 ? Math.max(...payments.map((p: any) => p.id)) : lastSeenId;

      return {
        inputs,
        updatedState: {
          lastSeenId: maxId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'payment.created',
        id: `payment-${ctx.input.paymentId}`,
        output: {
          paymentId: ctx.input.paymentId,
          invoiceId: ctx.input.invoiceId,
          amount: ctx.input.amount,
          note: ctx.input.note,
          receivedOn: ctx.input.receivedOn,
          transactionId: ctx.input.transactionId,
          transactionFee: ctx.input.transactionFee,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
