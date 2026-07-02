import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let newInvoice = SlateTrigger.create(spec, {
  name: 'New Invoice',
  key: 'new_invoice',
  description: 'Triggers when a new invoice is created in sevDesk.'
})
  .input(
    z.object({
      invoiceId: z.string().describe('Invoice ID'),
      invoiceData: z.any().describe('Full invoice data from sevDesk')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('Invoice ID'),
      invoiceNumber: z.string().optional(),
      contactId: z.string().optional(),
      contactName: z.string().optional(),
      invoiceDate: z.string().optional(),
      status: z.string().optional(),
      totalNet: z.string().optional(),
      totalGross: z.string().optional(),
      currency: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new SevdeskClient({ token: ctx.auth.token });

      let lastSeenId: string | undefined = ctx.state?.lastSeenId;

      let invoices = await client.listInvoices({
        limit: 50,
        offset: 0,
        embed: 'contact'
      });

      let sorted = (invoices ?? []).sort((a: any, b: any) => Number(b.id) - Number(a.id));

      let newInvoices: any[] = [];
      for (let inv of sorted) {
        let iId = String(inv.id);
        if (lastSeenId && Number(iId) <= Number(lastSeenId)) break;
        newInvoices.push(inv);
      }

      let updatedLastSeenId = sorted.length > 0 ? String(sorted[0].id) : lastSeenId;

      return {
        inputs: newInvoices.map((inv: any) => ({
          invoiceId: String(inv.id),
          invoiceData: inv
        })),
        updatedState: {
          lastSeenId: updatedLastSeenId
        }
      };
    },

    handleEvent: async ctx => {
      let inv = ctx.input.invoiceData;

      return {
        type: 'invoice.created',
        id: ctx.input.invoiceId,
        output: {
          invoiceId: ctx.input.invoiceId,
          invoiceNumber: inv.invoiceNumber ?? undefined,
          contactId: inv.contact?.id ? String(inv.contact.id) : undefined,
          contactName: inv.contact?.name || undefined,
          invoiceDate: inv.invoiceDate ?? undefined,
          status: inv.status != null ? String(inv.status) : undefined,
          totalNet: inv.sumNet ?? undefined,
          totalGross: inv.sumGross ?? undefined,
          currency: inv.currency ?? undefined,
          createdAt: inv.create ?? undefined
        }
      };
    }
  })
  .build();
