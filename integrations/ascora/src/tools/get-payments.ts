import { SlateTool } from 'slates';
import { z } from 'zod';
import { AscoraAccountingClient } from '../lib/client';
import { spec } from '../spec';

let paymentSchema = z.object({
  paymentId: z.string().optional().describe('Unique payment identifier'),
  paymentDate: z.string().optional().describe('Date the payment was made'),
  paymentAmount: z.number().optional().describe('Payment amount'),
  invoiceNumber: z.string().optional().describe('Associated invoice number'),
  invoiceDate: z.string().optional().describe('Date of the associated invoice'),
  companyName: z.string().optional().describe('Customer company name'),
  contactFirstName: z.string().optional().describe('Customer first name'),
  contactLastName: z.string().optional().describe('Customer last name')
});

export let getPayments = SlateTool.create(spec, {
  name: 'Get Payments',
  key: 'get_payments',
  description: `Retrieves payments from the Ascora Accounting API that have not yet been marked as sent to an accounting system.

Only returns payments linked to invoices that have already been marked as sent. Use **Mark Payments** after processing to prevent re-retrieval.`,
  instructions: [
    'Requires Basic Authentication (Accounting API credentials).',
    'Invoices must be marked as sent before their associated payments will appear.',
    'After successfully processing payments, use the Mark Payments tool to mark them as sent.'
  ],
  constraints: [
    'Only returns payments linked to invoices already marked as sent to accounts.',
    'Unmarked payments will continue to be returned in subsequent requests.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      payments: z.array(paymentSchema).describe('List of payment records'),
      count: z.number().describe('Number of payments returned')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.username || !ctx.auth.password) {
      throw new Error(
        'Basic Authentication credentials (username and password) are required for the Accounting API. Please use the Basic Authentication method.'
      );
    }

    let client = new AscoraAccountingClient({
      username: ctx.auth.username,
      password: ctx.auth.password
    });

    let rawPayments = await client.getPayments();

    let payments = rawPayments.map((pmt: any) => ({
      paymentId: pmt.PaymentId ?? pmt.paymentId,
      paymentDate: pmt.PaymentDate ?? pmt.paymentDate,
      paymentAmount: pmt.PaymentAmount ?? pmt.paymentAmount,
      invoiceNumber: pmt.InvoiceNumber ?? pmt.invoiceNumber,
      invoiceDate: pmt.InvoiceDate ?? pmt.invoiceDate,
      companyName: pmt.CompanyName ?? pmt.companyName,
      contactFirstName: pmt.ContactFirstName ?? pmt.contactFirstName,
      contactLastName: pmt.ContactLastName ?? pmt.contactLastName
    }));

    return {
      output: {
        payments,
        count: payments.length
      },
      message: `Retrieved **${payments.length}** unsent payment(s) from Ascora.`
    };
  })
  .build();
