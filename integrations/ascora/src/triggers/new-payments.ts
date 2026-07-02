import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { AscoraAccountingClient } from '../lib/client';
import { spec } from '../spec';

export let newPayments = SlateTrigger.create(spec, {
  name: 'New Payments',
  key: 'new_payments',
  description:
    'Triggers when new payments are available in Ascora that have not yet been marked as sent to an accounting system. Only payments linked to invoices already marked as sent will appear.'
})
  .input(
    z.object({
      paymentId: z.string().describe('Unique payment identifier'),
      paymentDate: z.string().optional().describe('Date the payment was made'),
      paymentAmount: z.number().optional().describe('Payment amount'),
      invoiceNumber: z.string().optional().describe('Associated invoice number'),
      invoiceDate: z.string().optional().describe('Date of the associated invoice'),
      companyName: z.string().optional().describe('Customer company name'),
      contactFirstName: z.string().optional().describe('Customer first name'),
      contactLastName: z.string().optional().describe('Customer last name')
    })
  )
  .output(
    z.object({
      paymentId: z.string().describe('Unique payment identifier'),
      paymentDate: z.string().optional().describe('Date the payment was made'),
      paymentAmount: z.number().optional().describe('Payment amount'),
      invoiceNumber: z.string().optional().describe('Associated invoice number'),
      invoiceDate: z.string().optional().describe('Date of the associated invoice'),
      companyName: z.string().optional().describe('Customer company name'),
      contactFirstName: z.string().optional().describe('Customer first name'),
      contactLastName: z.string().optional().describe('Customer last name')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      if (!ctx.auth.username || !ctx.auth.password) {
        return { inputs: [] };
      }

      let client = new AscoraAccountingClient({
        username: ctx.auth.username,
        password: ctx.auth.password
      });

      let rawPayments = await client.getPayments();

      let inputs = rawPayments.map((pmt: any) => ({
        paymentId: String(pmt.PaymentId ?? pmt.paymentId ?? ''),
        paymentDate: pmt.PaymentDate ?? pmt.paymentDate,
        paymentAmount: pmt.PaymentAmount ?? pmt.paymentAmount,
        invoiceNumber: pmt.InvoiceNumber ?? pmt.invoiceNumber,
        invoiceDate: pmt.InvoiceDate ?? pmt.invoiceDate,
        companyName: pmt.CompanyName ?? pmt.companyName,
        contactFirstName: pmt.ContactFirstName ?? pmt.contactFirstName,
        contactLastName: pmt.ContactLastName ?? pmt.contactLastName
      }));

      return {
        inputs,
        updatedState: {
          lastPollTimestamp: new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'payment.created',
        id: ctx.input.paymentId,
        output: {
          paymentId: ctx.input.paymentId,
          paymentDate: ctx.input.paymentDate,
          paymentAmount: ctx.input.paymentAmount,
          invoiceNumber: ctx.input.invoiceNumber,
          invoiceDate: ctx.input.invoiceDate,
          companyName: ctx.input.companyName,
          contactFirstName: ctx.input.contactFirstName,
          contactLastName: ctx.input.contactLastName
        }
      };
    }
  })
  .build();
