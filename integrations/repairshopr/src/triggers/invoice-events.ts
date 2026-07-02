import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let invoiceEvents = SlateTrigger.create(spec, {
  name: 'Invoice Events',
  key: 'invoice_events',
  description:
    'Triggers when an invoice is created or updated. Configure the webhook URL in RepairShopr under Admin > Notification Center.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of invoice event'),
      invoiceId: z.number().describe('Invoice ID'),
      webhookPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      invoiceId: z.number().describe('Invoice ID'),
      number: z.string().optional().describe('Invoice number'),
      customerId: z.number().optional().describe('Customer ID'),
      ticketId: z.number().optional().describe('Associated ticket ID'),
      date: z.string().optional().describe('Invoice date'),
      dueDate: z.string().optional().describe('Due date'),
      total: z.number().optional().describe('Total amount'),
      balance: z.number().optional().describe('Remaining balance'),
      status: z.string().optional().describe('Invoice status'),
      notes: z.string().optional().describe('Invoice notes'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last updated timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!body) return { inputs: [] };

      let invoice = body.invoice || body;
      let invoiceId = invoice.id || invoice.invoice_id;
      if (!invoiceId) return { inputs: [] };

      let eventType = body.type || body.event || body.action || 'updated';

      return {
        inputs: [
          {
            eventType: String(eventType),
            invoiceId: Number(invoiceId),
            webhookPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let invoice = ctx.input.webhookPayload?.invoice || ctx.input.webhookPayload || {};
      let eventType = ctx.input.eventType.toLowerCase().replace(/\s+/g, '_');

      if (eventType.includes('creat') || eventType.includes('new')) {
        eventType = 'created';
      } else {
        eventType = 'updated';
      }

      return {
        type: `invoice.${eventType}`,
        id: `invoice_${ctx.input.invoiceId}_${eventType}_${invoice.updated_at || Date.now()}`,
        output: {
          invoiceId: ctx.input.invoiceId,
          number: invoice.number?.toString(),
          customerId: invoice.customer_id,
          ticketId: invoice.ticket_id,
          date: invoice.date,
          dueDate: invoice.due_date,
          total: invoice.total ? Number(invoice.total) : undefined,
          balance: invoice.balance ? Number(invoice.balance) : undefined,
          status: invoice.status,
          notes: invoice.notes,
          createdAt: invoice.created_at,
          updatedAt: invoice.updated_at
        }
      };
    }
  })
  .build();
