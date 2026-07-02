import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newInvoiceTrigger = SlateTrigger.create(spec, {
  name: 'New Invoice',
  key: 'new_invoice',
  description: 'Triggers when a new invoice is created in Agiled.'
})
  .input(
    z.object({
      invoiceId: z.string().describe('ID of the invoice'),
      invoice: z.record(z.string(), z.unknown()).describe('Invoice record from Agiled')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('ID of the new invoice'),
      invoiceNumber: z.string().optional().describe('Invoice number'),
      clientId: z.string().optional().describe('Client ID'),
      total: z.string().optional().describe('Invoice total amount'),
      status: z.string().optional().describe('Invoice status'),
      issueDate: z.string().optional().describe('Issue date'),
      dueDate: z.string().optional().describe('Due date'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        brand: ctx.auth.brand
      });

      let lastKnownId = (ctx.state as Record<string, unknown>)?.lastKnownId as
        | number
        | undefined;

      let result = await client.listInvoices(1, 50);
      let invoices = result.data;

      let newInvoices = lastKnownId ? invoices.filter(i => Number(i.id) > lastKnownId) : [];

      let maxId = invoices.reduce(
        (max, i) => Math.max(max, Number(i.id) || 0),
        lastKnownId ?? 0
      );

      return {
        inputs: newInvoices.map(i => ({
          invoiceId: String(i.id),
          invoice: i
        })),
        updatedState: {
          lastKnownId: maxId
        }
      };
    },

    handleEvent: async ctx => {
      let i = ctx.input.invoice;
      return {
        type: 'invoice.created',
        id: ctx.input.invoiceId,
        output: {
          invoiceId: ctx.input.invoiceId,
          invoiceNumber: i.invoice_number as string | undefined,
          clientId: i.client_id != null ? String(i.client_id) : undefined,
          total: i.total != null ? String(i.total) : undefined,
          status: i.status as string | undefined,
          issueDate: i.issue_date as string | undefined,
          dueDate: i.due_date as string | undefined,
          createdAt: i.created_at as string | undefined
        }
      };
    }
  })
  .build();
