import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let invoiceEventsTrigger = SlateTrigger.create(spec, {
  name: 'Invoice Events',
  key: 'invoice_events',
  description:
    'Polls for new or updated invoices. Detects invoice creation, status changes, and payment updates.'
})
  .input(
    z.object({
      invoiceId: z.string(),
      eventType: z.string(),
      invoiceNumber: z.string().optional(),
      customerName: z.string().optional(),
      customerId: z.string().optional(),
      status: z.string().optional(),
      date: z.string().optional(),
      dueDate: z.string().optional(),
      total: z.number().optional(),
      balance: z.number().optional(),
      currencyCode: z.string().optional(),
      lastModifiedTime: z.string().optional()
    })
  )
  .output(
    z.object({
      invoiceId: z.string(),
      invoiceNumber: z.string().optional(),
      customerName: z.string().optional(),
      customerId: z.string().optional(),
      status: z.string().optional(),
      date: z.string().optional(),
      dueDate: z.string().optional(),
      total: z.number().optional(),
      balance: z.number().optional(),
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
      let knownInvoices = (ctx.state?.knownInvoices || {}) as Record<string, string>;

      let query: Record<string, any> = {
        sort_column: 'last_modified_time',
        sort_order: 'descending',
        per_page: 200
      };

      if (lastPollTime) {
        query.last_modified_time = lastPollTime;
      }

      let resp = await client.listInvoices(query);
      let invoices = resp.invoices || [];
      let inputs: any[] = [];
      let newKnownInvoices = { ...knownInvoices };

      for (let inv of invoices) {
        let lastKnownStatus = knownInvoices[inv.invoice_id];
        let eventType = lastKnownStatus ? 'updated' : 'created';

        if (lastKnownStatus !== inv.status || !lastKnownStatus) {
          inputs.push({
            invoiceId: inv.invoice_id,
            eventType,
            invoiceNumber: inv.invoice_number,
            customerName: inv.customer_name,
            customerId: inv.customer_id,
            status: inv.status,
            date: inv.date,
            dueDate: inv.due_date,
            total: inv.total,
            balance: inv.balance,
            currencyCode: inv.currency_code,
            lastModifiedTime: inv.last_modified_time
          });
        }

        newKnownInvoices[inv.invoice_id] = inv.status;
      }

      let newPollTime = invoices.length > 0 ? invoices[0].last_modified_time : lastPollTime;

      return {
        inputs,
        updatedState: {
          lastPollTime: newPollTime,
          knownInvoices: newKnownInvoices
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `invoice.${ctx.input.eventType}`,
        id: `${ctx.input.invoiceId}-${ctx.input.lastModifiedTime || Date.now()}`,
        output: {
          invoiceId: ctx.input.invoiceId,
          invoiceNumber: ctx.input.invoiceNumber,
          customerName: ctx.input.customerName,
          customerId: ctx.input.customerId,
          status: ctx.input.status,
          date: ctx.input.date,
          dueDate: ctx.input.dueDate,
          total: ctx.input.total,
          balance: ctx.input.balance,
          currencyCode: ctx.input.currencyCode,
          lastModifiedTime: ctx.input.lastModifiedTime
        }
      };
    }
  })
  .build();
