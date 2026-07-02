import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let invoiceEventSchema = z.object({
  invoiceId: z.string().describe('Xero invoice ID'),
  invoiceNumber: z.string().optional().describe('Invoice number'),
  type: z.string().optional().describe('ACCREC (sales) or ACCPAY (bills)'),
  status: z.string().optional().describe('Invoice status'),
  contactName: z.string().optional().describe('Contact name'),
  contactId: z.string().optional().describe('Contact ID'),
  date: z.string().optional().describe('Invoice date'),
  dueDate: z.string().optional().describe('Due date'),
  total: z.number().optional().describe('Total amount'),
  amountDue: z.number().optional().describe('Amount due'),
  amountPaid: z.number().optional().describe('Amount paid'),
  currencyCode: z.string().optional().describe('Currency code'),
  updatedDate: z.string().optional().describe('Last updated timestamp'),
  reference: z.string().optional().describe('Invoice reference'),
  subTotal: z.number().optional().describe('Subtotal'),
  totalTax: z.number().optional().describe('Total tax'),
  lineAmountTypes: z.string().optional().describe('Line amount types'),
  sentToContact: z.boolean().optional().describe('Whether emailed to contact')
});

export let invoiceChanges = SlateTrigger.create(spec, {
  name: 'Invoice Changes',
  key: 'invoice_changes',
  description:
    'Triggers when invoices or bills are created or updated in Xero, including status changes (authorised, paid, voided).'
})
  .input(
    z.object({
      invoiceId: z.string().describe('Xero invoice ID'),
      invoiceNumber: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      contactName: z.string().optional(),
      contactId: z.string().optional(),
      date: z.string().optional(),
      dueDate: z.string().optional(),
      total: z.number().optional(),
      amountDue: z.number().optional(),
      amountPaid: z.number().optional(),
      currencyCode: z.string().optional(),
      updatedDate: z.string().optional(),
      reference: z.string().optional(),
      subTotal: z.number().optional(),
      totalTax: z.number().optional(),
      lineAmountTypes: z.string().optional(),
      sentToContact: z.boolean().optional()
    })
  )
  .output(invoiceEventSchema)
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClientFromContext(ctx);

      let lastModified = (ctx.state as any)?.lastModified as string | undefined;

      let result = await client.getInvoices({
        modifiedAfter: lastModified,
        order: 'UpdatedDateUTC ASC',
        summaryOnly: true
      });

      let invoices = result.Invoices || [];

      let newLastModified = lastModified;
      if (invoices.length > 0) {
        let lastInvoice = invoices[invoices.length - 1];
        if (lastInvoice?.UpdatedDateUTC) {
          newLastModified = lastInvoice.UpdatedDateUTC;
        }
      }

      return {
        inputs: invoices.map(inv => ({
          invoiceId: inv.InvoiceID || '',
          invoiceNumber: inv.InvoiceNumber,
          type: inv.Type,
          status: inv.Status,
          contactName: inv.Contact?.Name,
          contactId: inv.Contact?.ContactID,
          date: inv.DateString || inv.Date,
          dueDate: inv.DueDateString || inv.DueDate,
          total: inv.Total,
          amountDue: inv.AmountDue,
          amountPaid: inv.AmountPaid,
          currencyCode: inv.CurrencyCode,
          updatedDate: inv.UpdatedDateUTC,
          reference: inv.Reference,
          subTotal: inv.SubTotal,
          totalTax: inv.TotalTax,
          lineAmountTypes: inv.LineAmountTypes,
          sentToContact: inv.SentToContact
        })),
        updatedState: {
          lastModified: newLastModified
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'invoice.updated',
        id: `${ctx.input.invoiceId}-${ctx.input.updatedDate || Date.now()}`,
        output: {
          invoiceId: ctx.input.invoiceId,
          invoiceNumber: ctx.input.invoiceNumber,
          type: ctx.input.type,
          status: ctx.input.status,
          contactName: ctx.input.contactName,
          contactId: ctx.input.contactId,
          date: ctx.input.date,
          dueDate: ctx.input.dueDate,
          total: ctx.input.total,
          amountDue: ctx.input.amountDue,
          amountPaid: ctx.input.amountPaid,
          currencyCode: ctx.input.currencyCode,
          updatedDate: ctx.input.updatedDate,
          reference: ctx.input.reference,
          subTotal: ctx.input.subTotal,
          totalTax: ctx.input.totalTax,
          lineAmountTypes: ctx.input.lineAmountTypes,
          sentToContact: ctx.input.sentToContact
        }
      };
    }
  })
  .build();
