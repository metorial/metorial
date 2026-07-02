import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let newInvoice = SlateTrigger.create(spec, {
  name: 'New Invoice',
  key: 'new_invoice',
  description: 'Triggers when a new invoice is created in Streamtime.'
})
  .input(
    z.object({
      invoiceId: z.number().describe('ID of the invoice'),
      raw: z.record(z.string(), z.any()).describe('Full invoice data')
    })
  )
  .output(
    z.object({
      invoiceId: z.number().describe('ID of the new invoice'),
      raw: z.record(z.string(), z.any()).describe('Full invoice data from the API')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new StreamtimeClient({ token: ctx.auth.token });
      let state = ctx.state as { knownInvoiceIds?: number[] } | null;
      let knownInvoiceIds = state?.knownInvoiceIds || [];

      let searchBody: Record<string, any> = {
        searchView: 11
      };

      let result = await client.search(searchBody);
      let invoices: any[] = Array.isArray(result)
        ? result
        : result.data || result.results || [];

      let newInvoices =
        knownInvoiceIds.length === 0
          ? []
          : invoices.filter((inv: any) => !knownInvoiceIds.includes(inv.id));

      let allIds = invoices.map((inv: any) => inv.id);

      return {
        inputs: newInvoices.map((inv: any) => ({
          invoiceId: inv.id,
          raw: inv
        })),
        updatedState: {
          knownInvoiceIds: allIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'invoice.created',
        id: String(ctx.input.invoiceId),
        output: {
          invoiceId: ctx.input.invoiceId,
          raw: ctx.input.raw
        }
      };
    }
  })
  .build();
