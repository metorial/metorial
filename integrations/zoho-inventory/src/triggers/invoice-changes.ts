import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let invoiceChanges = SlateTrigger.create(spec, {
  name: 'Invoice Changes',
  key: 'invoice_changes',
  description:
    'Triggers when invoices are created or updated in Zoho Inventory. Polls for recently modified invoices.'
})
  .input(
    z.object({
      invoiceId: z.string().describe('Invoice ID'),
      invoiceNumber: z.string().optional().describe('Invoice number'),
      customerName: z.string().optional().describe('Customer name'),
      status: z.string().optional().describe('Invoice status'),
      total: z.number().optional().describe('Total amount'),
      balanceDue: z.number().optional().describe('Balance due'),
      date: z.string().optional().describe('Invoice date'),
      dueDate: z.string().optional().describe('Due date'),
      lastModifiedTime: z.string().optional().describe('Last modified time')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('Invoice ID'),
      invoiceNumber: z.string().optional().describe('Invoice number'),
      customerName: z.string().optional().describe('Customer name'),
      status: z.string().optional().describe('Invoice status'),
      total: z.number().optional().describe('Total amount'),
      balanceDue: z.number().optional().describe('Balance due'),
      date: z.string().optional().describe('Invoice date'),
      dueDate: z.string().optional().describe('Due date'),
      lastModifiedTime: z.string().optional().describe('Last modified time')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);

      let result = await client.listInvoices({
        sort_column: 'last_modified_time',
        sort_order: 'descending',
        per_page: 25
      });

      let invoices = result.invoices || [];
      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;
      let newInvoices: any[] = [];

      for (let invoice of invoices) {
        if (
          lastPolledAt &&
          invoice.last_modified_time &&
          invoice.last_modified_time <= lastPolledAt
        ) {
          break;
        }
        newInvoices.push(invoice);
      }

      let updatedLastPolled =
        invoices.length > 0 && invoices[0].last_modified_time
          ? invoices[0].last_modified_time
          : lastPolledAt;

      return {
        inputs: newInvoices.map((inv: any) => ({
          invoiceId: String(inv.invoice_id),
          invoiceNumber: inv.invoice_number ?? undefined,
          customerName: inv.customer_name ?? undefined,
          status: inv.status ?? undefined,
          total: inv.total ?? undefined,
          balanceDue: inv.balance ?? undefined,
          date: inv.date ?? undefined,
          dueDate: inv.due_date ?? undefined,
          lastModifiedTime: inv.last_modified_time ?? undefined
        })),
        updatedState: {
          lastPolledAt: updatedLastPolled
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'invoice.updated',
        id: `inv-${ctx.input.invoiceId}-${ctx.input.lastModifiedTime || Date.now()}`,
        output: {
          invoiceId: ctx.input.invoiceId,
          invoiceNumber: ctx.input.invoiceNumber,
          customerName: ctx.input.customerName,
          status: ctx.input.status,
          total: ctx.input.total,
          balanceDue: ctx.input.balanceDue,
          date: ctx.input.date,
          dueDate: ctx.input.dueDate,
          lastModifiedTime: ctx.input.lastModifiedTime
        }
      };
    }
  })
  .build();
