import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinmeiClient } from '../lib/client';
import { spec } from '../spec';

export let listPayments = SlateTool.create(spec, {
  name: 'List Payments',
  key: 'list_payments',
  description: `Retrieve a list of payments from Finmei. Supports filtering by status and date range, with pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Number of payments to return (default: 20, max: 100)'),
      offset: z.number().optional().describe('Number of payments to skip (default: 0)'),
      status: z
        .enum(['pending', 'completed', 'failed'])
        .optional()
        .describe('Filter by payment status'),
      startDate: z
        .string()
        .optional()
        .describe('Filter payments from this date (ISO 8601 format, e.g., "2024-01-01")'),
      endDate: z
        .string()
        .optional()
        .describe('Filter payments up to this date (ISO 8601 format, e.g., "2024-12-31")')
    })
  )
  .output(
    z.object({
      payments: z
        .array(
          z.object({
            paymentId: z.string().describe('Payment ID'),
            invoiceId: z.string().optional().describe('Associated invoice ID'),
            amount: z.number().optional().describe('Payment amount'),
            date: z.string().optional().describe('Payment date'),
            mode: z.string().optional().describe('Payment method'),
            reference: z.string().optional().describe('Payment reference'),
            status: z.string().optional().describe('Payment status')
          })
        )
        .describe('List of payments'),
      total: z.number().optional().describe('Total number of payments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinmeiClient(ctx.auth.token);

    let result = await client.listPayments({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      status: ctx.input.status,
      start_date: ctx.input.startDate,
      end_date: ctx.input.endDate
    });

    let rawPayments = result?.data ?? result?.payments ?? result ?? [];
    let paymentsArray = Array.isArray(rawPayments) ? rawPayments : [];

    let payments = paymentsArray.map((p: any) => ({
      paymentId: String(p.id),
      invoiceId: p.invoice_id ? String(p.invoice_id) : undefined,
      amount: p.amount,
      date: p.date,
      mode: p.mode,
      reference: p.reference,
      status: p.status
    }));

    let total = result?.total ?? result?.meta?.total;

    return {
      output: {
        payments,
        total
      },
      message: `Found **${payments.length}** payment(s)${total ? ` out of ${total} total` : ''}.`
    };
  })
  .build();
