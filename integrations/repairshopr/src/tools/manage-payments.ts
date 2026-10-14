import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let paymentSchema = z.object({
  paymentId: z.number().describe('Payment ID'),
  invoiceId: z.number().optional().describe('First associated invoice ID'),
  invoiceIds: z.array(z.number()).optional().describe('All associated invoice IDs'),
  success: z.boolean().optional().describe('Whether the provider accepted the payment'),
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
  invoiceId: p.invoice_id ?? p.invoice_ids?.find((id: unknown) => typeof id === 'number'),
  invoiceIds: p.invoice_ids?.filter((id: unknown) => typeof id === 'number'),
  success: p.success ?? undefined,
  customerId: p.customer_id ?? p.customer?.id ?? undefined,
  amount:
    (p.payment_amount ?? p.amount) == null ? undefined : Number(p.payment_amount ?? p.amount),
  paymentMethod: p.payment_method ?? undefined,
  appliedAt: p.applied_at ?? undefined,
  notes: p.notes ?? undefined,
  createdAt: p.created_at ?? undefined,
  updatedAt: p.updated_at ?? undefined
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
      message: `Retrieved payment **${p.id}** — $${p.payment_amount ?? p.amount ?? 0} on invoice ${p.invoice_id ?? p.invoice_ids?.[0] ?? 'N/A'}.`
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
      amount: z
        .number()
        .describe(
          'Payment amount in major currency units, with at most two decimal places (for example 12.50)'
        ),
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
