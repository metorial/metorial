import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';
import { spec } from '../spec';

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
  .output(
    z.object({
      transactions: z.array(
        z.object({
          transactionId: z.number().describe('Transaction ID'),
          reference: z.string().describe('Transaction reference'),
          status: z.string().describe('Transaction status'),
          amount: z.number().describe('Amount in smallest currency unit'),
          currency: z.string().describe('Currency code'),
          channel: z.string().describe('Payment channel'),
          customerEmail: z.string().describe('Customer email'),
          paidAt: z.string().nullable().describe('Payment timestamp'),
          createdAt: z.string().describe('Creation timestamp')
        })
      ),
      totalCount: z.number().describe('Total number of transactions matching the filter'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.listTransactions({
      perPage: ctx.input.perPage,
      page: ctx.input.page,
      customer: ctx.input.customer,
      status: ctx.input.status,
      from: ctx.input.from,
      to: ctx.input.to,
      amount: ctx.input.amount
    });

    let transactions = (result.data ?? []).map((tx: any) => ({
      transactionId: tx.id,
      reference: tx.reference,
      status: tx.status,
      amount: tx.amount,
      currency: tx.currency,
      channel: tx.channel,
      customerEmail: tx.customer?.email ?? '',
      paidAt: tx.paid_at ?? null,
      createdAt: tx.created_at
    }));

    let meta = result.meta ?? {};

    return {
      output: {
        transactions,
        totalCount: meta.total ?? 0,
        currentPage: meta.page ?? 1,
        totalPages: meta.pageCount ?? 1
      },
      message: `Found **${meta.total ?? transactions.length}** transactions (page ${meta.page ?? 1} of ${meta.pageCount ?? 1}).`
    };
  })
  .build();
