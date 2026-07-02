import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let invoiceSchema = z.object({
  invoiceId: z.string(),
  invoiceNumber: z.string().optional(),
  status: z.string().optional(),
  customerName: z.string().optional(),
  customerId: z.string().optional(),
  date: z.string().optional(),
  dueDate: z.string().optional(),
  total: z.number().optional(),
  balance: z.number().optional(),
  currencyCode: z.string().optional(),
  lastModifiedTime: z.string()
});

export let updatedInvoice = SlateTrigger.create(spec, {
  name: 'Updated Invoice',
  key: 'updated_invoice',
  description:
    'Triggers when an invoice is updated in Zoho Invoice. Polls for recently modified invoices.'
})
  .input(invoiceSchema)
  .output(invoiceSchema)
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

      let state = ctx.state as { lastModifiedTime?: string } | null;
      let lastModifiedTime = state?.lastModifiedTime;

      let result = await client.listInvoices({
        sort_column: 'last_modified_time',
        sort_order: 'D',
        per_page: 25
      });

      let invoices = result.invoices ?? [];
      let inputs: any[] = [];
      let newestModifiedTime = lastModifiedTime;

      for (let inv of invoices) {
        let modifiedTime = inv.last_modified_time;
        if (!modifiedTime) continue;
        if (lastModifiedTime && modifiedTime <= lastModifiedTime) continue;

        inputs.push({
          invoiceId: inv.invoice_id,
          invoiceNumber: inv.invoice_number,
          status: inv.status,
          customerName: inv.customer_name,
          customerId: inv.customer_id,
          date: inv.date,
          dueDate: inv.due_date,
          total: inv.total,
          balance: inv.balance,
          currencyCode: inv.currency_code,
          lastModifiedTime: modifiedTime
        });

        if (!newestModifiedTime || modifiedTime > newestModifiedTime) {
          newestModifiedTime = modifiedTime;
        }
      }

      return {
        inputs,
        updatedState: {
          lastModifiedTime: newestModifiedTime || lastModifiedTime
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'invoice.updated',
        id: `${ctx.input.invoiceId}-${ctx.input.lastModifiedTime}`,
        output: {
          invoiceId: ctx.input.invoiceId,
          invoiceNumber: ctx.input.invoiceNumber,
          status: ctx.input.status,
          customerName: ctx.input.customerName,
          customerId: ctx.input.customerId,
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
