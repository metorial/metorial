import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import {
  FinmeiClient,
  optionalNumber,
  optionalString,
  pagination,
  readList,
  requireId
} from '../lib/client';
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
        .describe('Number of payments to return (the provider may use a fixed page size)'),
      offset: z.number().optional().describe('Number of payments to skip (zero-based)'),
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
      rawResponse: z.any().optional().describe('Complete provider response'),
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

    let payments = readList(result, 'payments').map(p => ({
      paymentId: requireId(p.id, 'payment ID'),
      ...pickDefined({
        invoiceId:
          p.invoice_id === undefined || p.invoice_id === null
            ? undefined
            : requireId(p.invoice_id, 'payment invoice ID'),
        amount: optionalNumber(p.amount, 'payment amount'),
        date: optionalString(p.date, 'payment date'),
        mode: optionalString(p.mode, 'payment mode'),
        reference: optionalString(p.reference, 'payment reference'),
        status: optionalString(p.status, 'payment status')
      })
    }));

    let metadata = pagination(result);
    return {
      output: {
        payments,
        total: metadata.total,
        rawResponse: result
      },
      message: `Found **${payments.length}** payment(s)${metadata.total !== undefined ? ` out of ${metadata.total} total` : ''}.`
    };
  })
  .build();
