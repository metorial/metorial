import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { paginationFields } from '../lib/schemas';
import { spec } from '../spec';

let invoicePaymentOutputSchema = z.object({
  paymentId: z.number().describe('Invoice payment ID'),
  date: z.string().optional().describe('Payment date'),
  paidTotal: z.number().optional().describe('Amount paid'),
  paidTotalInAccountCurrency: z
    .number()
    .optional()
    .describe('Amount paid in the account currency'),
  currency: z.string().optional().describe('Payment currency'),
  description: z.string().optional().describe('Payment description'),
  invoice: z
    .object({
      id: z.number(),
      identifier: z.string().optional(),
      title: z.string().optional()
    })
    .optional()
    .describe('Linked invoice identity'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

interface InvoicePayment {
  id: number;
  date?: string;
  paid_total?: number;
  paid_total_in_account_currency?: number;
  currency?: string;
  description?: string | null;
  invoice?: { id: number; identifier?: string; title?: string } | null;
  created_at?: string;
  updated_at?: string;
}

let mapInvoicePayment = (payment: InvoicePayment) => ({
  paymentId: payment.id,
  date: payment.date,
  paidTotal: payment.paid_total,
  paidTotalInAccountCurrency: payment.paid_total_in_account_currency,
  currency: payment.currency,
  description: payment.description ?? undefined,
  invoice: payment.invoice ?? undefined,
  createdAt: payment.created_at,
  updatedAt: payment.updated_at
});

export let listInvoicePayments = SlateTool.create(spec, {
  name: 'List Invoice Payments',
  key: 'list_invoice_payments',
  description:
    'Retrieve a page of invoice payments, optionally filtered by invoice and payment date range.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...paginationFields,
      invoiceId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Filter by invoice ID from list_invoices or get_invoice.'),
      dateFrom: z.string().optional().describe('Earliest payment date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('Latest payment date (YYYY-MM-DD)'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter by last update timestamp (ISO 8601)')
    })
  )
  .output(z.object({ payments: z.array(invoicePaymentOutputSchema) }))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
    let payments: InvoicePayment[] = await client.listInvoicePayments(
      pickDefined({
        page: ctx.input.page,
        per_page: ctx.input.perPage,
        invoice_id: ctx.input.invoiceId,
        date_from: ctx.input.dateFrom,
        date_to: ctx.input.dateTo,
        updated_after: ctx.input.updatedAfter
      })
    );
    return {
      output: { payments: payments.map(mapInvoicePayment) },
      message: `Found **${payments.length}** invoice payments on this page.`
    };
  })
  .build();

export let createInvoicePayment = SlateTool.create(spec, {
  name: 'Create Invoice Payment',
  key: 'create_invoice_payment',
  description:
    'Record an invoice payment. MOCO updates the invoice payment status automatically based on the recorded amount.',
  tags: { destructive: false }
})
  .input(
    z.object({
      invoiceId: z
        .number()
        .int()
        .positive()
        .describe('Invoice ID from list_invoices or get_invoice.'),
      date: z.string().describe('Payment date (YYYY-MM-DD)'),
      paidTotal: z.number().describe('Amount paid in the payment currency'),
      currency: z.string().optional().describe('Payment currency code'),
      partiallyPaid: z
        .boolean()
        .optional()
        .describe('Whether the payment is a partial payment'),
      description: z.string().optional().describe('Payment description')
    })
  )
  .output(invoicePaymentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
    let payment: InvoicePayment = await client.createInvoicePayment(
      ctx.input.invoiceId,
      pickDefined({
        date: ctx.input.date,
        paid_total: ctx.input.paidTotal,
        currency: ctx.input.currency,
        partially_paid: ctx.input.partiallyPaid,
        description: ctx.input.description
      })
    );
    return {
      output: mapInvoicePayment(payment),
      message: `Recorded invoice payment **${payment.id}** for invoice **${ctx.input.invoiceId}**.`
    };
  })
  .build();
