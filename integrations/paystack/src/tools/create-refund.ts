import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';

import {
  exactId,
  optionalNumericId,
  optionalRecord,
  pagination,
  record,
  records,
  validateOutput
} from '../lib/transport';
import { spec } from '../spec';

const createRefundOutput = z.object({
  refundId: z.number().optional().describe('Refund ID'),
  exactRefundId: z
    .string()
    .describe(
      'Exact provider resource ID; legacy numeric ID is omitted outside its safe range'
    ),
  exactTransactionId: z.string().describe('Exact refunded transaction ID'),
  transactionReference: z.string().optional().describe('Original transaction reference'),
  amount: z.number().describe('Refund amount'),
  currency: z.string().describe('Currency'),
  status: z.string().describe('Refund status')
});

export let createRefund = SlateTool.create(spec, {
  name: 'Create Refund',
  key: 'create_refund',
  description: `Create a refund for a completed transaction. You can refund the full amount or a partial amount. Refunds go through statuses: pending, processing, processed, success/failed.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      transactionReference: z
        .string()
        .describe('Transaction reference or transaction ID to refund'),
      amount: z
        .number()
        .optional()
        .describe(
          'Amount to refund in smallest currency unit. Defaults to full transaction amount if not specified'
        ),
      currency: z.string().optional().describe('Currency code'),
      customerNote: z
        .string()
        .optional()
        .describe('Note to send to the customer about the refund'),
      merchantNote: z.string().optional().describe('Internal note about the refund reason')
    })
  )
  .output(createRefundOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.createRefund({
      transaction: ctx.input.transactionReference,
      amount: ctx.input.amount,
      currency: ctx.input.currency,
      customerNote: ctx.input.customerNote,
      merchantNote: ctx.input.merchantNote
    });
    const refund = record(result.data);
    const transaction = optionalRecord(refund.transaction);
    const output = {
      refundId: optionalNumericId(refund.id),
      exactRefundId: exactId(refund.id),
      transactionReference: transaction.reference,
      exactTransactionId: exactId(transaction.id ?? refund.transaction),
      amount: refund.amount,
      currency: refund.currency,
      status: refund.status
    };
    return {
      output: validateOutput(createRefundOutput, output),
      message:
        'Refund request accepted for processing; final refund settlement is not confirmed.'
    };
  })
  .build();
const listRefundsOutput = z.object({
  refunds: z.array(
    z.object({
      refundId: z.number().optional().describe('Refund ID'),
      exactRefundId: z
        .string()
        .describe(
          'Exact provider resource ID; legacy numeric ID is omitted outside its safe range'
        ),
      amount: z.number().describe('Refund amount'),
      currency: z.string().describe('Currency'),
      status: z.string().describe('Refund status'),
      exactTransactionId: z.string().describe('Exact refunded transaction ID'),
      transactionReference: z.string().optional().describe('Transaction reference'),
      createdAt: z.string().describe('Creation timestamp')
    })
  ),
  totalCount: z.number().optional().describe('Total refunds'),
  currentPage: z.number().optional().describe('Current page'),
  totalPages: z.number().optional().describe('Total pages'),
  nextCursor: z.string().nullable().optional().describe('Provider next cursor, when returned'),
  previousCursor: z
    .string()
    .nullable()
    .optional()
    .describe('Provider previous cursor, when returned'),
  perPage: z.number().optional().describe('Observed provider page size')
});

export let listRefunds = SlateTool.create(spec, {
  name: 'List Refunds',
  key: 'list_refunds',
  description: `Retrieve a paginated list of refunds on your integration. Filter by reference, currency, or date range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      perPage: z.number().optional().describe('Records per page'),
      page: z.number().optional().describe('Page number'),
      reference: z.string().optional().describe('Filter by transaction reference'),
      currency: z.string().optional().describe('Filter by currency'),
      from: z.string().optional().describe('Start date (ISO 8601)'),
      to: z.string().optional().describe('End date (ISO 8601)')
    })
  )
  .output(listRefundsOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.listRefunds(ctx.input);
    const output = {
      refunds: records(result.data).map(item => ({
        refundId: optionalNumericId(item.id),
        exactRefundId: exactId(item.id),
        amount: item.amount,
        currency: item.currency,
        status: item.status,
        transactionReference: optionalRecord(item.transaction).reference,
        exactTransactionId: exactId(optionalRecord(item.transaction).id ?? item.transaction),
        createdAt: item.created_at ?? item.createdAt
      })),
      ...pagination(result.meta)
    };
    return {
      output: validateOutput(listRefundsOutput, output),
      message:
        'Retrieved the requested page; continuation and counts are included only when returned by Paystack.'
    };
  })
  .build();
