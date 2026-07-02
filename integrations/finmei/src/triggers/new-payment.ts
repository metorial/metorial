import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { FinmeiClient } from '../lib/client';
import { spec } from '../spec';

export let newPayment = SlateTrigger.create(spec, {
  name: 'New Payment',
  key: 'new_payment',
  description:
    'Triggers when a new payment is recorded in Finmei. Polls the payments list and detects newly added payments.'
})
  .input(
    z.object({
      paymentId: z.string().describe('Payment ID'),
      invoiceId: z.string().optional().describe('Associated invoice ID'),
      amount: z.number().optional().describe('Payment amount'),
      date: z.string().optional().describe('Payment date'),
      mode: z.string().optional().describe('Payment method'),
      reference: z.string().optional().describe('Payment reference'),
      status: z.string().optional().describe('Payment status')
    })
  )
  .output(
    z.object({
      paymentId: z.string().describe('Payment ID'),
      invoiceId: z.string().optional().describe('Associated invoice ID'),
      amount: z.number().optional().describe('Payment amount'),
      date: z.string().optional().describe('Payment date'),
      mode: z.string().optional().describe('Payment method/mode'),
      reference: z.string().optional().describe('Payment reference number'),
      status: z.string().optional().describe('Payment status')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new FinmeiClient(ctx.auth.token);

      let state = ctx.state as { knownPaymentIds?: string[] } | null;
      let knownPaymentIds = new Set(state?.knownPaymentIds ?? []);

      let result = await client.listPayments({ limit: 100, offset: 0 });
      let rawPayments = result?.data ?? result?.payments ?? result ?? [];
      let paymentsArray = Array.isArray(rawPayments) ? rawPayments : [];

      let inputs: Array<{
        paymentId: string;
        invoiceId?: string;
        amount?: number;
        date?: string;
        mode?: string;
        reference?: string;
        status?: string;
      }> = [];

      let allIds: string[] = [];

      for (let p of paymentsArray) {
        let id = String(p.id);
        allIds.push(id);

        if (knownPaymentIds.size > 0 && !knownPaymentIds.has(id)) {
          inputs.push({
            paymentId: id,
            invoiceId: p.invoice_id ? String(p.invoice_id) : undefined,
            amount: p.amount,
            date: p.date,
            mode: p.mode,
            reference: p.reference,
            status: p.status
          });
        }
      }

      return {
        inputs,
        updatedState: {
          knownPaymentIds: allIds
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
          date: ctx.input.date,
          mode: ctx.input.mode,
          reference: ctx.input.reference,
          status: ctx.input.status
        }
      };
    }
  })
  .build();
