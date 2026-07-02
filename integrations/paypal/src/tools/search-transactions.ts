import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { PayPalClient } from '../lib/client';
import { spec } from '../spec';

export let searchTransactions = SlateTool.create(spec, {
  name: 'Search Transactions',
  key: 'search_transactions',
  description: `Search PayPal transaction history by date range, status, amount, and other filters. Useful for reconciliation, reporting, and finding specific transactions.`,
  constraints: [
    'Date range must be within the last 3 years.',
    'Maximum date range is 31 days per request.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z
        .string()
        .describe('Start date in ISO 8601 format (e.g. 2024-01-01T00:00:00Z)'),
      endDate: z.string().describe('End date in ISO 8601 format (e.g. 2024-01-31T23:59:59Z)'),
      transactionStatus: z
        .string()
        .optional()
        .describe('Filter by status: D (Denied), P (Pending), S (Successful), V (Reversed)'),
      transactionType: z
        .string()
        .optional()
        .describe('Filter by type (e.g. T0001 for payments, T0003 for subscriptions)'),
      transactionId: z.string().optional().describe('Find a specific transaction by ID'),
      transactionCurrency: z.string().optional().describe('Filter by currency code'),
      page: z.number().optional().describe('Page number (1-based)'),
      pageSize: z.number().optional().describe('Results per page (max 500)')
    })
  )
  .output(
    z.object({
      totalItems: z.number().optional().describe('Total matching transactions'),
      totalPages: z.number().optional().describe('Total number of pages'),
      transactions: z
        .array(
          z.object({
            transactionId: z.string().describe('Transaction ID'),
            transactionStatus: z.string().optional().describe('Transaction status'),
            transactionType: z.string().optional().describe('Transaction type code'),
            grossAmount: z.string().optional().describe('Gross amount'),
            feeAmount: z.string().optional().describe('Fee amount'),
            netAmount: z.string().optional().describe('Net amount'),
            currencyCode: z.string().optional().describe('Currency code'),
            payerEmail: z.string().optional().describe('Payer email'),
            payerName: z.string().optional().describe('Payer name'),
            transactionDate: z.string().optional().describe('Transaction date')
          })
        )
        .describe('Transaction results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayPalClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      environment: ctx.auth.environment
    });

    let result = await client.searchTransactions({
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      transactionStatus: ctx.input.transactionStatus,
      transactionType: ctx.input.transactionType,
      transactionId: ctx.input.transactionId,
      transactionCurrency: ctx.input.transactionCurrency,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let details = (result.transaction_details || []) as any[];
    let transactions = details.map((t: any) => {
      let info = t.transaction_info || {};
      let payer = t.payer_info || {};
      return {
        transactionId: info.transaction_id,
        transactionStatus: info.transaction_status,
        transactionType: info.transaction_event_code,
        grossAmount: info.transaction_amount?.value,
        feeAmount: info.fee_amount?.value,
        netAmount: info.ending_balance?.value,
        currencyCode: info.transaction_amount?.currency_code,
        payerEmail: payer.email_address,
        payerName: payer.payer_name
          ? `${payer.payer_name.given_name || ''} ${payer.payer_name.surname || ''}`.trim()
          : undefined,
        transactionDate: info.transaction_initiation_date
      };
    });

    return {
      output: {
        totalItems: result.total_items,
        totalPages: result.total_pages,
        transactions
      },
      message: `Found ${transactions.length} transaction(s)${result.total_items ? ` (${result.total_items} total)` : ''}.`
    };
  })
  .build();
