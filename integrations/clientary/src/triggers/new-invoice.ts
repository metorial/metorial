import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newInvoiceTrigger = SlateTrigger.create(spec, {
  name: 'New or Updated Invoice',
  key: 'new_or_updated_invoice',
  description:
    'Triggers when an invoice is created or updated in Clientary. Polls for invoices updated since the last check.'
})
  .input(
    z.object({
      invoiceId: z.number().describe('ID of the invoice'),
      clientId: z.number().optional().describe('Associated client ID'),
      number: z.string().optional().describe('Invoice number'),
      date: z.string().optional().describe('Invoice date'),
      dueDate: z.string().optional().describe('Due date'),
      currencyCode: z.string().optional().describe('Currency code'),
      status: z.number().optional().describe('Invoice status code'),
      total: z.number().optional().describe('Invoice total'),
      balance: z.number().optional().describe('Remaining balance'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .output(
    z.object({
      invoiceId: z.number().describe('ID of the invoice'),
      clientId: z.number().optional().describe('Associated client ID'),
      number: z.string().optional().describe('Invoice number'),
      date: z.string().optional().describe('Invoice date'),
      dueDate: z.string().optional().describe('Due date'),
      currencyCode: z.string().optional().describe('Currency code'),
      status: z
        .number()
        .optional()
        .describe('Status: 0=Draft, 1=Sent, 2=Viewed, 3=Cancelled, 4=Paid, 5=Pending'),
      subtotal: z.number().optional().describe('Subtotal before tax'),
      total: z.number().optional().describe('Total amount'),
      balance: z.number().optional().describe('Remaining balance'),
      taxAmount: z.number().optional().describe('Total tax amount'),
      notes: z.string().optional().describe('Invoice notes'),
      poNumber: z.string().optional().describe('Purchase order number'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

      let lastPolled = ctx.state?.lastPolled as string | undefined;

      let result = await client.listInvoices({
        updatedSince: lastPolled
      });

      let invoices = result.invoices || [];

      let inputs = invoices.map((inv: any) => ({
        invoiceId: inv.id,
        clientId: inv.client_id,
        number: inv.number,
        date: inv.date,
        dueDate: inv.due_date,
        currencyCode: inv.currency_code,
        status: inv.status,
        total: inv.total,
        balance: inv.balance,
        updatedAt: inv.updated_at
      }));

      let now = new Date().toISOString().split('T')[0];

      return {
        inputs,
        updatedState: {
          lastPolled: now
        }
      };
    },

    handleEvent: async ctx => {
      let inv = ctx.input;

      return {
        type: 'invoice.updated',
        id: `invoice-${inv.invoiceId}-${inv.updatedAt || inv.invoiceId}`,
        output: {
          invoiceId: inv.invoiceId,
          clientId: inv.clientId,
          number: inv.number,
          date: inv.date,
          dueDate: inv.dueDate,
          currencyCode: inv.currencyCode,
          status: inv.status,
          subtotal: undefined,
          total: inv.total,
          balance: inv.balance,
          taxAmount: undefined,
          notes: undefined,
          poNumber: undefined,
          updatedAt: inv.updatedAt
        }
      };
    }
  })
  .build();
