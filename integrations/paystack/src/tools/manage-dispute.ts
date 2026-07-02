import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';
import { spec } from '../spec';

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
  .output(
    z.object({
      disputes: z.array(
        z.object({
          disputeId: z.number().describe('Dispute ID'),
          status: z.string().describe('Dispute status'),
          amount: z.number().describe('Disputed amount'),
          currency: z.string().describe('Currency'),
          transactionReference: z.string().describe('Transaction reference'),
          category: z.string().nullable().describe('Dispute category'),
          dueDate: z.string().nullable().describe('Response due date'),
          createdAt: z.string().describe('Creation timestamp')
        })
      ),
      totalCount: z.number().describe('Total disputes'),
      currentPage: z.number().describe('Current page'),
      totalPages: z.number().describe('Total pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.listDisputes({
      perPage: ctx.input.perPage,
      page: ctx.input.page,
      status: ctx.input.status,
      transaction: ctx.input.transaction,
      from: ctx.input.from,
      to: ctx.input.to
    });

    let disputes = (result.data ?? []).map((d: any) => ({
      disputeId: d.id,
      status: d.status,
      amount: d.amount ?? 0,
      currency: d.currency ?? '',
      transactionReference: d.transaction?.reference ?? '',
      category: d.category ?? null,
      dueDate: d.due_date ?? null,
      createdAt: d.created_at ?? d.createdAt
    }));

    let meta = result.meta ?? {};

    return {
      output: {
        disputes,
        totalCount: meta.total ?? 0,
        currentPage: meta.page ?? 1,
        totalPages: meta.pageCount ?? 1
      },
      message: `Found **${meta.total ?? disputes.length}** disputes.`
    };
  })
  .build();

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
  .output(
    z.object({
      disputeId: z.number().describe('Dispute ID'),
      status: z.string().describe('Updated dispute status'),
      message: z.string().describe('Resolution message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.resolveDispute(ctx.input.disputeId, {
      resolution: ctx.input.resolution,
      message: ctx.input.message,
      refundAmount: ctx.input.refundAmount,
      uploadedFilename: ctx.input.uploadedFilename
    });

    let dispute = result.data;

    return {
      output: {
        disputeId: dispute.id,
        status: dispute.status,
        message: dispute.message ?? ctx.input.message
      },
      message: `Dispute **${dispute.id}** resolved with status **${dispute.status}**.`
    };
  })
  .build();
