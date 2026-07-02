import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let invoiceChanges = SlateTrigger.create(spec, {
  name: 'Invoice Changes',
  key: 'invoice_changes',
  description:
    'Triggers when invoices are created or modified in your Elorus organization. Polls for new and updated invoices.'
})
  .input(
    z.object({
      invoiceId: z.string().describe('The invoice ID.'),
      eventType: z
        .enum(['created', 'updated'])
        .describe('Whether the invoice was newly created or updated.'),
      invoice: z.any().describe('The full invoice object.')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('The invoice ID.'),
      sequenceNumber: z.string().optional().describe('The invoice sequence number.'),
      clientId: z.string().optional().describe('The client contact ID.'),
      clientName: z.string().optional().describe('Client display name.'),
      date: z.string().optional().describe('Invoice date.'),
      dueDate: z.string().optional().describe('Payment due date.'),
      total: z.string().optional().describe('Invoice total amount.'),
      currencyCode: z.string().optional().describe('Currency code.'),
      status: z.string().optional().describe('Invoice status (draft, issued, paid, etc.).'),
      isDraft: z.boolean().optional().describe('Whether the invoice is a draft.'),
      isVoid: z.boolean().optional().describe('Whether the invoice is voided.'),
      invoice: z.any().describe('The full invoice object.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        organizationId: ctx.config.organizationId
      });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let knownIds = (ctx.state?.knownIds as string[]) || [];

      let params: any = {
        ordering: '-modified',
        pageSize: 50
      };

      if (lastPollTime) {
        params.modifiedAfter = lastPollTime;
      }

      let result = await client.listInvoices(params);
      let now = new Date().toISOString();

      let inputs = result.results.map((invoice: any) => ({
        invoiceId: invoice.id,
        eventType: (knownIds.includes(invoice.id) ? 'updated' : 'created') as
          | 'created'
          | 'updated',
        invoice
      }));

      let updatedKnownIds = [
        ...new Set([...knownIds, ...result.results.map((inv: any) => inv.id)])
      ].slice(-1000);

      return {
        inputs,
        updatedState: {
          lastPollTime: now,
          knownIds: updatedKnownIds
        }
      };
    },
    handleEvent: async ctx => {
      let inv = ctx.input.invoice;

      return {
        type: `invoice.${ctx.input.eventType}`,
        id: `${inv.id}-${inv.modified || inv.created || ctx.input.eventType}`,
        output: {
          invoiceId: inv.id,
          sequenceNumber: inv.sequence_flat,
          clientId: inv.client,
          clientName: inv.client_display_name,
          date: inv.date,
          dueDate: inv.due_date,
          total: inv.total,
          currencyCode: inv.currency_code,
          status: inv.status,
          isDraft: inv.draft,
          isVoid: inv.is_void,
          invoice: inv
        }
      };
    }
  })
  .build();
