import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let transactionSchema = z.object({
  transactionId: z.number().describe('Flutterwave transaction ID'),
  txRef: z.string().describe('Your unique transaction reference'),
  flwRef: z.string().describe('Flutterwave reference'),
  amount: z.number().describe('Transaction amount'),
  currency: z.string().describe('Transaction currency'),
  chargedAmount: z.number().describe('Amount charged to customer'),
  appFee: z.number().optional().describe('Application fee'),
  merchantFee: z.number().optional().describe('Merchant fee'),
  status: z.string().describe('Transaction status (successful, failed, pending)'),
  paymentType: z.string().describe('Payment method used (card, account, mobilemoney, etc.)'),
  createdAt: z.string().describe('Transaction creation timestamp'),
  customerEmail: z.string().optional().describe('Customer email'),
  customerName: z.string().optional().describe('Customer name')
});

export let listTransactions = SlateTool.create(spec, {
  name: 'List Transactions',
  key: 'list_transactions',
  description: `Retrieve a list of payment transactions from your Flutterwave account. Supports filtering by date range, status, currency, customer email, and payment type. Returns paginated results with transaction details including amounts, status, and customer information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      from: z.string().optional().describe('Start date for filtering (YYYY-MM-DD)'),
      to: z.string().optional().describe('End date for filtering (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number for pagination'),
      status: z
        .enum(['successful', 'failed', 'pending'])
        .optional()
        .describe('Filter by transaction status'),
      currency: z.string().optional().describe('Filter by currency code (e.g. NGN, USD, GHS)'),
      customerEmail: z.string().optional().describe('Filter by customer email address'),
      paymentType: z
        .string()
        .optional()
        .describe('Filter by payment type (card, account, ussd, mobilemoney)')
    })
  )
  .output(
    z.object({
      transactions: z.array(transactionSchema).describe('List of transactions'),
      totalCount: z.number().optional().describe('Total number of matching transactions'),
      currentPage: z.number().optional().describe('Current page number'),
      totalPages: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTransactions({
      from: ctx.input.from,
      to: ctx.input.to,
      page: ctx.input.page,
      status: ctx.input.status,
      currency: ctx.input.currency,
      customerEmail: ctx.input.customerEmail,
      paymentType: ctx.input.paymentType
    });

    let transactions = (result.data || []).map((t: any) => ({
      transactionId: t.id,
      txRef: t.tx_ref,
      flwRef: t.flw_ref,
      amount: t.amount,
      currency: t.currency,
      chargedAmount: t.charged_amount,
      appFee: t.app_fee,
      merchantFee: t.merchant_fee,
      status: t.status,
      paymentType: t.payment_type,
      createdAt: t.created_at,
      customerEmail: t.customer?.email,
      customerName: t.customer?.name
    }));

    let pageInfo = result.meta?.page_info;

    return {
      output: {
        transactions,
        totalCount: pageInfo?.total,
        currentPage: pageInfo?.current_page,
        totalPages: pageInfo?.total_pages
      },
      message: `Found **${transactions.length}** transactions${pageInfo?.total ? ` (${pageInfo.total} total)` : ''}.`
    };
  })
  .build();
