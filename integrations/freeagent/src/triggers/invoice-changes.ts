import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let invoiceChanges = SlateTrigger.create(spec, {
  name: 'Invoice Changes',
  key: 'invoice_changes',
  description: 'Polls for new or updated invoices in FreeAgent.'
})
  .input(
    z.object({
      invoiceId: z.string().describe('FreeAgent invoice ID'),
      reference: z.string().optional().describe('Invoice reference'),
      status: z.string().optional().describe('Invoice status'),
      contact: z.string().optional().describe('Contact URL'),
      totalValue: z.string().optional().describe('Total invoice value'),
      datedOn: z.string().optional().describe('Invoice date'),
      dueOn: z.string().optional().describe('Due date'),
      paidOn: z.string().optional().describe('Date the invoice was paid'),
      currency: z.string().optional().describe('Currency code'),
      updatedAt: z.string().optional().describe('Last updated timestamp'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      raw: z.record(z.string(), z.any()).optional().describe('Full invoice payload')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('FreeAgent invoice ID'),
      reference: z.string().optional().describe('Invoice reference number'),
      status: z.string().optional().describe('Current invoice status'),
      contact: z.string().optional().describe('Contact URL'),
      totalValue: z.string().optional().describe('Total invoice value'),
      datedOn: z.string().optional().describe('Invoice date'),
      dueOn: z.string().optional().describe('Due date'),
      paidOn: z.string().optional().describe('Date paid'),
      currency: z.string().optional().describe('Currency code'),
      updatedAt: z.string().optional().describe('Last updated timestamp'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new FreeAgentClient({
        token: ctx.auth.token,
        environment: ctx.config.environment
      });

      let lastPolled = ctx.state?.lastPolled as string | undefined;
      let invoices = await client.listInvoices({
        updatedSince: lastPolled,
        nestedItems: false
      });

      let now = new Date().toISOString();

      let inputs = invoices.map((inv: any) => {
        let url = inv.url || '';
        let invoiceId = url.split('/').pop() || '';
        return {
          invoiceId,
          reference: inv.reference,
          status: inv.status,
          contact: inv.contact,
          totalValue: inv.total_value != null ? String(inv.total_value) : undefined,
          datedOn: inv.dated_on,
          dueOn: inv.due_on,
          paidOn: inv.paid_on,
          currency: inv.currency,
          updatedAt: inv.updated_at,
          createdAt: inv.created_at,
          raw: inv
        };
      });

      return {
        inputs,
        updatedState: {
          lastPolled: now
        }
      };
    },

    handleEvent: async ctx => {
      let isNew = ctx.input.createdAt === ctx.input.updatedAt;
      let eventType = isNew ? 'created' : 'updated';

      return {
        type: `invoice.${eventType}`,
        id: `${ctx.input.invoiceId}-${ctx.input.updatedAt || Date.now()}`,
        output: {
          invoiceId: ctx.input.invoiceId,
          reference: ctx.input.reference,
          status: ctx.input.status,
          contact: ctx.input.contact,
          totalValue: ctx.input.totalValue,
          datedOn: ctx.input.datedOn,
          dueOn: ctx.input.dueOn,
          paidOn: ctx.input.paidOn,
          currency: ctx.input.currency,
          updatedAt: ctx.input.updatedAt,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
