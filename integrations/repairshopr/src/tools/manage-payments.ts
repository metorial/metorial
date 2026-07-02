import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let paymentSchema = z.object({
  paymentId: z.number().describe('Payment ID'),
  invoiceId: z.number().optional().describe('Associated invoice ID'),
  customerId: z.number().optional().describe('Customer ID'),
  amount: z.number().optional().describe('Payment amount'),
  paymentMethod: z.string().optional().describe('Payment method'),
  appliedAt: z.string().optional().describe('Date payment was applied'),
  notes: z.string().optional().describe('Payment notes'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp')
});

let mapPayment = (p: any) => ({
  paymentId: p.id,
  invoiceId: p.invoice_id,
  customerId: p.customer_id,
  amount: p.amount ? Number(p.amount) : undefined,
  paymentMethod: p.payment_method,
  appliedAt: p.applied_at,
  notes: p.notes,
  createdAt: p.created_at,
  updatedAt: p.updated_at
});

export let searchPayments = SlateTool.create(spec, {
  name: 'Search Payments',
  key: 'search_payments',
  description: `Search and list payments. Filter by customer, invoice, or date range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.number().optional().describe('Filter by customer ID'),
      invoiceId: z.number().optional().describe('Filter by invoice ID'),
      createdBefore: z
        .string()
        .optional()
        .describe('Filter payments before this date (YYYY-MM-DD)'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter payments after this date (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      payments: z.array(paymentSchema),
      totalPages: z.number().optional(),
      totalEntries: z.number().optional(),
      page: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.listPayments(ctx.input);
    let payments = (result.payments || []).map(mapPayment);

    return {
      output: {
        payments,
        totalPages: result.meta?.total_pages,
        totalEntries: result.meta?.total_entries,
        page: result.meta?.page
      },
      message: `Found **${payments.length}** payment(s).`
    };
  })
  .build();

export let getPayment = SlateTool.create(spec, {
  name: 'Get Payment',
  key: 'get_payment',
  description: `Retrieve detailed information about a specific payment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      paymentId: z.number().describe('The payment ID to retrieve')
    })
  )
  .output(paymentSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.getPayment(ctx.input.paymentId);
    let p = result.payment || result;

    return {
      output: mapPayment(p),
      message: `Retrieved payment **${p.id}** — $${p.amount || 0} on invoice ${p.invoice_id}.`
    };
  })
  .build();

export let createPayment = SlateTool.create(spec, {
  name: 'Create Payment',
  key: 'create_payment',
  description: `Record a new payment against an invoice. Specify the invoice ID, amount, and optionally the payment method and date.`
})
  .input(
    z.object({
      invoiceId: z.number().describe('Invoice ID to apply the payment to'),
      amount: z.number().describe('Payment amount'),
      paymentMethod: z
        .string()
        .optional()
        .describe('Payment method (e.g. "Cash", "Credit Card", "Check")'),
      paymentDate: z.string().optional().describe('Date the payment was made (YYYY-MM-DD)'),
      notes: z.string().optional().describe('Payment notes')
    })
  )
  .output(paymentSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.createPayment(ctx.input);
    let p = result.payment || result;

    return {
      output: mapPayment(p),
      message: `Recorded payment of **$${ctx.input.amount}** on invoice **${ctx.input.invoiceId}**.`
    };
  })
  .build();
