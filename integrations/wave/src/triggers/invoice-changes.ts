import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { WaveClient } from '../lib/client';
import { spec } from '../spec';

let _moneySchema = z
  .object({
    value: z.string().optional(),
    currency: z
      .object({
        code: z.string().optional(),
        symbol: z.string().optional()
      })
      .optional()
  })
  .optional();

export let invoiceChanges = SlateTrigger.create(spec, {
  name: 'Invoice Changes',
  key: 'invoice_changes',
  description:
    'Triggers when invoices are created or modified in a Wave business. Detects new invoices and changes to existing invoices by polling the invoices list.'
})
  .input(
    z.object({
      invoiceId: z.string().describe('ID of the invoice'),
      changeType: z.enum(['created', 'updated']).describe('Type of change detected'),
      invoice: z.any().describe('Full invoice data from Wave')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('Unique identifier of the invoice'),
      status: z.string().describe('Invoice status'),
      invoiceNumber: z.string().optional().describe('Invoice number'),
      invoiceDate: z.string().optional().describe('Invoice date'),
      dueDate: z.string().optional().describe('Due date'),
      title: z.string().optional().describe('Invoice title'),
      customerName: z.string().optional().describe('Customer name'),
      customerEmail: z.string().optional().describe('Customer email'),
      currencyCode: z.string().optional().describe('Currency code'),
      amountDue: z.string().optional().describe('Amount due'),
      amountPaid: z.string().optional().describe('Amount paid'),
      total: z.string().optional().describe('Invoice total'),
      pdfUrl: z.string().optional().describe('URL to download invoice PDF'),
      viewUrl: z.string().optional().describe('URL to view invoice online'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      modifiedAt: z.string().optional().describe('Last modification timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new WaveClient(ctx.auth.token);
      let state = ctx.state as
        | { businessId?: string; knownInvoices?: Record<string, string> }
        | undefined;

      // We need a businessId to poll. On first run, get first available business.
      let businessId = state?.businessId;
      if (!businessId) {
        let businesses = await client.listBusinesses(1, 1);
        if (businesses.items.length === 0) {
          return { inputs: [], updatedState: state || {} };
        }
        businessId = businesses.items[0]!.id as string;
      }

      let knownInvoices: Record<string, string> = state?.knownInvoices || {};
      let inputs: Array<{
        invoiceId: string;
        changeType: 'created' | 'updated';
        invoice: any;
      }> = [];

      // Fetch recent invoices (first page, sorted by most recent)
      let result = await client.listInvoices(businessId, 1, 50);

      for (let invoice of result.items) {
        let inv = invoice as any;
        let previousModifiedAt = knownInvoices[inv.id];

        if (!previousModifiedAt) {
          // New invoice (not seen before)
          // Only trigger for new invoices if this is not the first poll (to avoid flooding)
          if (state?.knownInvoices) {
            inputs.push({
              invoiceId: inv.id,
              changeType: 'created',
              invoice: inv
            });
          }
        } else if (inv.modifiedAt && inv.modifiedAt !== previousModifiedAt) {
          // Invoice was modified
          inputs.push({
            invoiceId: inv.id,
            changeType: 'updated',
            invoice: inv
          });
        }

        knownInvoices[inv.id] = inv.modifiedAt || '';
      }

      return {
        inputs,
        updatedState: {
          businessId,
          knownInvoices
        }
      };
    },

    handleEvent: async ctx => {
      let inv = ctx.input.invoice;
      return {
        type: `invoice.${ctx.input.changeType}`,
        id: `${ctx.input.invoiceId}-${inv.modifiedAt || ctx.input.changeType}`,
        output: {
          invoiceId: ctx.input.invoiceId,
          status: inv.status,
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate,
          dueDate: inv.dueDate,
          title: inv.title,
          customerName: inv.customer?.name,
          customerEmail: inv.customer?.email,
          currencyCode: inv.currency?.code,
          amountDue: inv.amountDue?.value,
          amountPaid: inv.amountPaid?.value,
          total: inv.total?.value,
          pdfUrl: inv.pdfUrl,
          viewUrl: inv.viewUrl,
          createdAt: inv.createdAt,
          modifiedAt: inv.modifiedAt
        }
      };
    }
  })
  .build();
