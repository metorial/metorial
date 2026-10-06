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

const listDisputesOutput = z.object({
  disputes: z.array(
    z.object({
      disputeId: z.number().optional().describe('Dispute ID'),
      exactDisputeId: z
        .string()
        .describe(
          'Exact provider resource ID; legacy numeric ID is omitted outside its safe range'
        ),
      status: z.string().describe('Dispute status'),
      amount: z.number().describe('Disputed amount'),
      currency: z.string().describe('Currency'),
      transactionReference: z.string().describe('Transaction reference'),
      category: z.string().nullable().describe('Dispute category'),
      dueDate: z.string().nullable().describe('Response due date'),
      createdAt: z.string().describe('Creation timestamp')
    })
  ),
  totalCount: z.number().optional().describe('Total disputes'),
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

export let listDisputes = SlateTool.create(spec, {
  name: 'List Disputes',
  key: 'list_disputes',
  description: `Retrieve a paginated list of transaction disputes. Filter by status, transaction, or date range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      useCursor: z.boolean().optional().describe('Use cursor pagination; omit page when true'),
      next: z.string().optional().describe('Next cursor from the prior response'),
      previous: z.string().optional().describe('Previous cursor from the prior response'),
      perPage: z.number().optional().describe('Records per page'),
      page: z.number().optional().describe('Page number'),
      status: z
        .string()
        .optional()
        .describe('Filter by dispute status (e.g., awaiting-merchant-feedback, resolved)'),
      transaction: z.string().optional().describe('Filter by transaction ID'),
      from: z.string().optional().describe('Start date (ISO 8601)'),
      to: z.string().optional().describe('End date (ISO 8601)')
    })
  )
  .output(listDisputesOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.listDisputes(ctx.input);
    const output = {
      disputes: records(result.data).map(item => ({
        disputeId: optionalNumericId(item.id),
        exactDisputeId: exactId(item.id),
        status: item.status,
        amount: item.amount ?? optionalRecord(item.transaction).amount,
        currency: item.currency ?? optionalRecord(item.transaction).currency,
        transactionReference:
          item.transaction_reference ?? optionalRecord(item.transaction).reference,
        category: item.category ?? null,
        dueDate: item.dueAt ?? item.due_date ?? null,
        createdAt: item.created_at ?? item.createdAt
      })),
      ...pagination(result.meta)
    };
    return {
      output: validateOutput(listDisputesOutput, output),
      message:
        'Retrieved the requested page; continuation and counts are included only when returned by Paystack.'
    };
  })
  .build();
const resolveDisputeOutput = z.object({
  disputeId: z.number().optional().describe('Dispute ID'),
  exactDisputeId: z
    .string()
    .describe(
      'Exact provider resource ID; legacy numeric ID is omitted outside its safe range'
    ),
  status: z.string().describe('Updated dispute status'),
  message: z.string().describe('Resolution message')
});

export let resolveDispute = SlateTool.create(spec, {
  name: 'Resolve Dispute',
  key: 'resolve_dispute',
  description: `Resolve a transaction dispute by providing evidence or accepting the dispute with a refund.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      disputeId: z.string().describe('Dispute ID to resolve'),
      resolution: z
        .enum(['merchant-accepted', 'declined'])
        .describe(
          'Resolution: merchant-accepted (accept with refund) or declined (reject with evidence)'
        ),
      message: z.string().describe('Message/evidence for the resolution'),
      refundAmount: z
        .number()
        .optional()
        .describe('Refund amount if accepting (in smallest currency unit)'),
      uploadedFilename: z.string().optional().describe('Filename of uploaded evidence')
    })
  )
  .output(resolveDisputeOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.resolveDispute(ctx.input.disputeId, ctx.input);
    const dispute = record(result.data);
    const output = {
      disputeId: optionalNumericId(dispute.id),
      exactDisputeId: exactId(dispute.id),
      status: dispute.status,
      message:
        typeof dispute.message === 'string'
          ? dispute.message
          : optionalRecord(dispute.message).body
    };
    return {
      output: validateOutput(resolveDisputeOutput, output),
      message:
        'Dispute resolution response received; review the returned state. Funds or final dispute state may be affected.'
    };
  })
  .build();
