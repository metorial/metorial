import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newInvoice = SlateTrigger.create(spec, {
  name: 'New Invoice',
  key: 'new_invoice',
  description:
    'Triggers when a new invoice is created in Zoho Invoice. Polls for recently created invoices.'
})
  .input(
    z.object({
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
      createdTime: z.string()
    })
  )
  .output(
    z.object({
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

      let result = await client.listInvoices({
        sort_column: 'created_time',
        sort_order: 'D',
        per_page: 25
      });

      let invoices = result.invoices ?? [];
      let inputs: any[] = [];
      let newestCreatedTime = lastCreatedTime;

      for (let inv of invoices) {
        let createdTime = inv.created_time;
        if (!createdTime) continue;
        if (lastCreatedTime && createdTime <= lastCreatedTime) continue;

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
        type: 'invoice.created',
        id: ctx.input.invoiceId,
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
          createdTime: ctx.input.createdTime
        }
      };
    }
  })
  .build();
