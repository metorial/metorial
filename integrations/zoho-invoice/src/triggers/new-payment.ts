import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newPayment = SlateTrigger.create(spec, {
  name: 'New Payment',
  key: 'new_payment',
  description:
    'Triggers when a new customer payment is received in Zoho Invoice. Polls for recently created payments.'
})
  .input(
    z.object({
      paymentId: z.string(),
      paymentNumber: z.string().optional(),
      customerName: z.string().optional(),
      customerId: z.string().optional(),
      invoiceNumbers: z.string().optional(),
      date: z.string().optional(),
      amount: z.number().optional(),
      currencyCode: z.string().optional(),
      paymentMode: z.string().optional(),
      createdTime: z.string()
    })
  )
  .output(
    z.object({
      paymentId: z.string(),
      paymentNumber: z.string().optional(),
      customerName: z.string().optional(),
      customerId: z.string().optional(),
      invoiceNumbers: z.string().optional(),
      date: z.string().optional(),
      amount: z.number().optional(),
      currencyCode: z.string().optional(),
      paymentMode: z.string().optional(),
      createdTime: z.string()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        organizationId: ctx.config.organizationId,
        region: ctx.auth.region
      });

      let state = ctx.state as { lastCreatedTime?: string } | null;
      let lastCreatedTime = state?.lastCreatedTime;

      let result = await client.listPayments({
        sort_column: 'created_time',
        sort_order: 'D',
        per_page: 25
      });

      let payments = result.payments ?? [];
      let inputs: any[] = [];
      let newestCreatedTime = lastCreatedTime;

      for (let pmt of payments) {
        let createdTime = pmt.created_time;
        if (!createdTime) continue;
        if (lastCreatedTime && createdTime <= lastCreatedTime) continue;

        inputs.push({
          paymentId: pmt.payment_id,
          paymentNumber: pmt.payment_number,
          customerName: pmt.customer_name,
          customerId: pmt.customer_id,
          invoiceNumbers: pmt.invoice_numbers,
          date: pmt.date,
          amount: pmt.amount,
          currencyCode: pmt.currency_code,
          paymentMode: pmt.payment_mode,
          createdTime
        });

        if (!newestCreatedTime || createdTime > newestCreatedTime) {
          newestCreatedTime = createdTime;
        }
      }

      return {
        inputs,
        updatedState: {
          lastCreatedTime: newestCreatedTime || lastCreatedTime
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'payment.created',
        id: ctx.input.paymentId,
        output: {
          paymentId: ctx.input.paymentId,
          paymentNumber: ctx.input.paymentNumber,
          customerName: ctx.input.customerName,
          customerId: ctx.input.customerId,
          invoiceNumbers: ctx.input.invoiceNumbers,
          date: ctx.input.date,
          amount: ctx.input.amount,
          currencyCode: ctx.input.currencyCode,
          paymentMode: ctx.input.paymentMode,
          createdTime: ctx.input.createdTime
        }
      };
    }
  })
  .build();
