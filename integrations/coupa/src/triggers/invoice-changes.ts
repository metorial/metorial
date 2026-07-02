import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { CoupaClient } from '../lib/client';
import { spec } from '../spec';

export let invoiceChanges = SlateTrigger.create(spec, {
  name: 'Invoice Changes',
  key: 'invoice_changes',
  description:
    'Triggers when invoices are created, approved, disputed, or otherwise updated in Coupa. Polls for changes based on the updated_at timestamp.'
})
  .input(
    z.object({
      invoiceId: z.number().describe('Invoice ID'),
      invoiceNumber: z.string().nullable().optional().describe('Invoice number'),
      status: z.string().nullable().optional().describe('Current invoice status'),
      updatedAt: z.string().describe('Last update timestamp'),
      rawData: z.any().describe('Full invoice data')
    })
  )
  .output(
    z.object({
      invoiceId: z.number().describe('Coupa invoice ID'),
      invoiceNumber: z.string().nullable().optional().describe('Invoice number'),
      status: z.string().nullable().optional().describe('Current invoice status'),
      invoiceDate: z.string().nullable().optional().describe('Invoice date'),
      supplier: z.any().nullable().optional().describe('Supplier object'),
      totalAmount: z.any().nullable().optional().describe('Invoice total'),
      currency: z.any().nullable().optional().describe('Currency'),
      invoiceLines: z.array(z.any()).nullable().optional().describe('Invoice line items'),
      documentType: z.string().nullable().optional().describe('Document type'),
      createdAt: z.string().nullable().optional().describe('Creation timestamp'),
      updatedAt: z.string().nullable().optional().describe('Last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new CoupaClient({
        token: ctx.auth.token,
        instanceUrl: ctx.config.instanceUrl
      });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let filters: Record<string, string> = {};

      if (lastPollTime) {
        filters['updated-at[gt]'] = lastPollTime;
      }

      let results = await client.listInvoices({
        filters,
        orderBy: 'updated_at',
        dir: 'asc',
        limit: 50
      });

      let invoices = Array.isArray(results) ? results : [];

      let newLastPollTime = lastPollTime;
      if (invoices.length > 0) {
        let lastInv = invoices[invoices.length - 1];
        newLastPollTime = lastInv['updated-at'] ?? lastInv.updated_at ?? lastPollTime;
      }

      return {
        inputs: invoices.map((inv: any) => ({
          invoiceId: inv.id,
          invoiceNumber: inv['invoice-number'] ?? inv.invoice_number ?? null,
          status: inv.status ?? null,
          updatedAt: inv['updated-at'] ?? inv.updated_at ?? '',
          rawData: inv
        })),
        updatedState: {
          lastPollTime: newLastPollTime ?? new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      let inv = ctx.input.rawData;

      return {
        type: 'invoice.updated',
        id: `inv-${ctx.input.invoiceId}-${ctx.input.updatedAt}`,
        output: {
          invoiceId: ctx.input.invoiceId,
          invoiceNumber: ctx.input.invoiceNumber,
          status: ctx.input.status,
          invoiceDate: inv['invoice-date'] ?? inv.invoice_date ?? null,
          supplier: inv.supplier ?? null,
          totalAmount: inv.total ?? inv.total ?? null,
          currency: inv.currency ?? null,
          invoiceLines: inv['invoice-lines'] ?? inv.invoice_lines ?? null,
          documentType: inv['document-type'] ?? inv.document_type ?? null,
          createdAt: inv['created-at'] ?? inv.created_at ?? null,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
