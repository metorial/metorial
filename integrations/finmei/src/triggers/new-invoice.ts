import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { FinmeiClient } from '../lib/client';
import { spec } from '../spec';

export let newInvoice = SlateTrigger.create(spec, {
  name: 'New Invoice',
  key: 'new_invoice',
  description:
    'Triggers when a new invoice is created in Finmei. Polls the invoices list and detects newly added invoices.'
})
  .input(
    z.object({
      invoiceId: z.string().describe('Invoice ID'),
      code: z.string().optional().describe('Invoice code/number'),
      status: z.string().optional().describe('Invoice status'),
      currency: z.string().optional().describe('Currency code'),
      amountDue: z.number().optional().describe('Amount due'),
      issueDate: z.string().optional().describe('Issue date'),
      dueDate: z.string().optional().describe('Due date')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('Invoice ID'),
      code: z.string().optional().describe('Invoice code/number'),
      status: z.string().optional().describe('Invoice status'),
      currency: z.string().optional().describe('Currency code'),
      amountDue: z.number().optional().describe('Amount due on the invoice'),
      issueDate: z.string().optional().describe('Invoice issue date'),
      dueDate: z.string().optional().describe('Invoice due date')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new FinmeiClient(ctx.auth.token);

      let state = ctx.state as { knownInvoiceIds?: string[] } | null;
      let knownInvoiceIds = new Set(state?.knownInvoiceIds ?? []);

      let result = await client.listInvoices({ page: 1, per_page: 100 });
      let rawInvoices = result?.data ?? result?.invoices ?? result ?? [];
      let invoicesArray = Array.isArray(rawInvoices) ? rawInvoices : [];

      let inputs: Array<{
        invoiceId: string;
        code?: string;
        status?: string;
        currency?: string;
        amountDue?: number;
        issueDate?: string;
        dueDate?: string;
      }> = [];

      let allIds: string[] = [];

      for (let inv of invoicesArray) {
        let id = String(inv.id);
        allIds.push(id);

        if (knownInvoiceIds.size > 0 && !knownInvoiceIds.has(id)) {
          inputs.push({
            invoiceId: id,
            code: inv.code,
            status: inv.status,
            currency: inv.currency,
            amountDue: inv.amount_due ?? inv.total,
            issueDate: inv.issue_date ?? inv.date,
            dueDate: inv.due_date
          });
        }
      }

      return {
        inputs,
        updatedState: {
          knownInvoiceIds: allIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'invoice.created',
        id: `invoice-${ctx.input.invoiceId}`,
        output: {
          invoiceId: ctx.input.invoiceId,
          code: ctx.input.code,
          status: ctx.input.status,
          currency: ctx.input.currency,
          amountDue: ctx.input.amountDue,
          issueDate: ctx.input.issueDate,
          dueDate: ctx.input.dueDate
        }
      };
    }
  })
  .build();
