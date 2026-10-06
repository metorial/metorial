import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';

import {
  exactId,
  optionalNumericId,
  optionalRecord,
  pagination,
  records,
  validateOutput
} from '../lib/transport';
import { spec } from '../spec';

const listTransactionsOutput = z.object({
  transactions: z.array(
    z.object({
      exactTransactionId: z
        .string()
        .describe(
          'Exact unsigned 64-bit transaction ID; use this field for durable identifiers'
        ),
      transactionId: z.number().optional().describe('Transaction ID'),
      reference: z.string().describe('Transaction reference'),
      status: z.string().describe('Transaction status'),
      amount: z.number().describe('Amount in smallest currency unit'),
      currency: z.string().describe('Currency code'),
      channel: z.string().optional().describe('Payment channel'),
      customerEmail: z.string().describe('Customer email'),
      paidAt: z.string().nullable().describe('Payment timestamp'),
      createdAt: z.string().describe('Creation timestamp')
    })
  ),
  totalCount: z
    .number()
    .optional()
    .describe('Total number of transactions matching the filter'),
  currentPage: z.number().optional().describe('Current page number'),
  totalPages: z.number().optional().describe('Total number of pages'),
  nextCursor: z.string().nullable().optional().describe('Provider next cursor, when returned'),
  previousCursor: z
    .string()
    .nullable()
    .optional()
    .describe('Provider previous cursor, when returned'),
  perPage: z.number().optional().describe('Observed provider page size')
});

export let listTransactions = SlateTool.create(spec, {
  name: 'List Transactions',
  key: 'list_transactions',
  description: `Retrieve a list of transactions on your integration. Supports filtering by status, customer, date range, and amount. Returns paginated results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      useCursor: z.boolean().optional().describe('Use cursor pagination; omit page when true'),
      next: z.string().optional().describe('Next cursor from the prior response'),
      previous: z.string().optional().describe('Previous cursor from the prior response'),
      perPage: z.number().optional().describe('Number of records per page (default 50)'),
      page: z.number().optional().describe('Page number to retrieve'),
      customer: z.string().optional().describe('Filter by customer ID'),
      status: z
        .enum(['success', 'failed', 'abandoned'])
        .optional()
        .describe('Filter by transaction status'),
      from: z.string().optional().describe('Start date for filtering (ISO 8601 format)'),
      to: z.string().optional().describe('End date for filtering (ISO 8601 format)'),
      amount: z.number().optional().describe('Filter by amount (in smallest currency unit)')
    })
  )
  .output(listTransactionsOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.listTransactions(ctx.input);
    const output = {
      transactions: records(result.data).map(item => ({
        transactionId: optionalNumericId(item.id),
        exactTransactionId: exactId(item.id),
        reference: item.reference,
        status: item.status,
        amount: item.amount,
        currency: item.currency,
        channel: item.channel ?? undefined,
        customerEmail: optionalRecord(item.customer).email,
        paidAt: item.paid_at ?? item.paidAt ?? null,
        createdAt: item.created_at ?? item.createdAt
      })),
      ...pagination(result.meta)
    };
    return {
      output: validateOutput(listTransactionsOutput, output),
      message:
        'Retrieved the requested page; continuation and counts are included only when returned by Paystack.'
    };
  })
  .build();
