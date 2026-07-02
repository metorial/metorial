import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

export let invoiceChanges = SlateTrigger.create(spec, {
  name: 'Invoice Changes',
  key: 'invoice_changes',
  description:
    'Triggers when invoices are created or updated in Harvest. Polls for changes since the last check.'
})
  .input(
    z.object({
      invoiceId: z.number().describe('ID of the invoice'),
      updatedAt: z.string().describe('When the invoice was last updated'),
      createdAt: z.string().describe('When the invoice was created'),
      isNew: z.boolean().describe('Whether this is a newly created invoice'),
      invoice: z.any().describe('Full invoice data from the API')
    })
  )
  .output(
    z.object({
      invoiceId: z.number().describe('ID of the invoice'),
      clientId: z.number().optional().describe('Client ID'),
      clientName: z.string().optional().describe('Client name'),
      number: z.string().nullable().describe('Invoice number'),
      amount: z.number().describe('Total amount'),
      dueAmount: z.number().describe('Amount due'),
      state: z.string().describe('Invoice state (draft, open, paid, closed)'),
      issueDate: z.string().nullable().describe('Issue date'),
      dueDate: z.string().nullable().describe('Due date'),
      subject: z.string().nullable().describe('Subject'),
      currency: z.string().describe('Currency code'),
      createdAt: z.string().describe('Created timestamp'),
      updatedAt: z.string().describe('Updated timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new HarvestClient({
        token: ctx.auth.token,
        accountId: ctx.config.accountId
      });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let knownIds = (ctx.state?.knownIds as number[]) ?? [];

      let params: any = {
        perPage: 100
      };
      if (lastPollTime) {
        params.updatedSince = lastPollTime;
      }

      let result = await client.listInvoices(params);
      let invoices = result.results;

      let page = 2;
      while (result.nextPage) {
        result = await client.listInvoices({ ...params, page });
        invoices = invoices.concat(result.results);
        page++;
      }

      let newPollTime = new Date().toISOString();

      let inputs = invoices.map((inv: any) => ({
        invoiceId: inv.id,
        updatedAt: inv.updated_at,
        createdAt: inv.created_at,
        isNew: !knownIds.includes(inv.id),
        invoice: inv
      }));

      let updatedKnownIds = [
        ...new Set([...knownIds, ...invoices.map((i: any) => i.id)])
      ].slice(-10000);

      return {
        inputs,
        updatedState: {
          lastPollTime: newPollTime,
          knownIds: updatedKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      let inv = ctx.input.invoice;
      let eventType = ctx.input.isNew ? 'created' : 'updated';

      return {
        type: `invoice.${eventType}`,
        id: `${inv.id}-${inv.updated_at}`,
        output: {
          invoiceId: inv.id,
          clientId: inv.client?.id,
          clientName: inv.client?.name,
          number: inv.number,
          amount: inv.amount,
          dueAmount: inv.due_amount,
          state: inv.state,
          issueDate: inv.issue_date,
          dueDate: inv.due_date,
          subject: inv.subject,
          currency: inv.currency,
          createdAt: inv.created_at,
          updatedAt: inv.updated_at
        }
      };
    }
  })
  .build();
