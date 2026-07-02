import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let customerPaymentEventsTrigger = SlateTrigger.create(spec, {
  name: 'Customer Payment Events',
  key: 'customer_payment_events',
  description:
    'Polls for new customer payments received. Detects when payments are recorded against invoices.'
})
  .input(
    z.object({
      paymentId: z.string(),
      eventType: z.string(),
      paymentNumber: z.string().optional(),
      customerId: z.string().optional(),
      customerName: z.string().optional(),
      amount: z.number().optional(),
      date: z.string().optional(),
      paymentMode: z.string().optional(),
      currencyCode: z.string().optional(),
      lastModifiedTime: z.string().optional()
    })
  )
  .output(
    z.object({
      paymentId: z.string(),
      paymentNumber: z.string().optional(),
      customerId: z.string().optional(),
      customerName: z.string().optional(),
      amount: z.number().optional(),
      date: z.string().optional(),
      paymentMode: z.string().optional(),
      currencyCode: z.string().optional(),
      lastModifiedTime: z.string().optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);
      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let knownPayments = (ctx.state?.knownPayments || {}) as Record<string, boolean>;

      let query: Record<string, any> = {
        sort_column: 'last_modified_time',
        sort_order: 'descending',
        per_page: 200
      };

      if (lastPollTime) {
        query.last_modified_time = lastPollTime;
      }

      let resp = await client.listCustomerPayments(query);
      let payments = resp.customerpayments || resp.payments || [];
      let inputs: any[] = [];
      let newKnownPayments = { ...knownPayments };

      for (let p of payments) {
        let isKnown = knownPayments[p.payment_id];
        let eventType = isKnown ? 'updated' : 'created';

        inputs.push({
          paymentId: p.payment_id,
          eventType,
          paymentNumber: p.payment_number,
          customerId: p.customer_id,
          customerName: p.customer_name,
          amount: p.amount,
          date: p.date,
          paymentMode: p.payment_mode,
          currencyCode: p.currency_code,
          lastModifiedTime: p.last_modified_time
        });

        newKnownPayments[p.payment_id] = true;
      }

      let newPollTime = payments.length > 0 ? payments[0].last_modified_time : lastPollTime;

      return {
        inputs,
        updatedState: {
          lastPollTime: newPollTime,
          knownPayments: newKnownPayments
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `customer_payment.${ctx.input.eventType}`,
        id: `${ctx.input.paymentId}-${ctx.input.lastModifiedTime || Date.now()}`,
        output: {
          paymentId: ctx.input.paymentId,
          paymentNumber: ctx.input.paymentNumber,
          customerId: ctx.input.customerId,
          customerName: ctx.input.customerName,
          amount: ctx.input.amount,
          date: ctx.input.date,
          paymentMode: ctx.input.paymentMode,
          currencyCode: ctx.input.currencyCode,
          lastModifiedTime: ctx.input.lastModifiedTime
        }
      };
    }
  })
  .build();
