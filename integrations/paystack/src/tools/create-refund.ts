import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';
import { spec } from '../spec';

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
  .output(
    z.object({
      refundId: z.number().describe('Refund ID'),
      transactionReference: z.string().describe('Original transaction reference'),
      amount: z.number().describe('Refund amount'),
      currency: z.string().describe('Currency'),
      status: z.string().describe('Refund status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.createRefund({
      transaction: ctx.input.transactionReference,
      amount: ctx.input.amount,
      currency: ctx.input.currency,
      customerNote: ctx.input.customerNote,
      merchantNote: ctx.input.merchantNote
    });

    let refund = result.data;

    return {
      output: {
        refundId: refund.id,
        transactionReference: refund.transaction?.reference ?? ctx.input.transactionReference,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status
      },
      message: `Refund created for transaction **${ctx.input.transactionReference}**. Amount: ${refund.amount} ${refund.currency}. Status: **${refund.status}**.`
    };
  })
  .build();

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
  .output(
    z.object({
      refunds: z.array(
        z.object({
          refundId: z.number().describe('Refund ID'),
          amount: z.number().describe('Refund amount'),
          currency: z.string().describe('Currency'),
          status: z.string().describe('Refund status'),
          transactionReference: z.string().describe('Transaction reference'),
          createdAt: z.string().describe('Creation timestamp')
        })
      ),
      totalCount: z.number().describe('Total refunds'),
      currentPage: z.number().describe('Current page'),
      totalPages: z.number().describe('Total pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.listRefunds({
      perPage: ctx.input.perPage,
      page: ctx.input.page,
      reference: ctx.input.reference,
      currency: ctx.input.currency,
      from: ctx.input.from,
      to: ctx.input.to
    });

    let refunds = (result.data ?? []).map((r: any) => ({
      refundId: r.id,
      amount: r.amount,
      currency: r.currency,
      status: r.status,
      transactionReference: r.transaction?.reference ?? '',
      createdAt: r.created_at ?? r.createdAt
    }));

    let meta = result.meta ?? {};

    return {
      output: {
        refunds,
        totalCount: meta.total ?? 0,
        currentPage: meta.page ?? 1,
        totalPages: meta.pageCount ?? 1
      },
      message: `Found **${meta.total ?? refunds.length}** refunds.`
    };
  })
  .build();
