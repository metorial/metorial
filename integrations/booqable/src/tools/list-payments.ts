import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildClientConfig, flattenResourceList } from '../lib/helpers';
import { spec } from '../spec';

export let listPayments = SlateTool.create(spec, {
  name: 'List Payments',
  key: 'list_payments',
  description: `List payments including charges, authorizations, and refunds. Filter by order or payment status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageNumber: z.number().optional().describe('Page number (starts at 1)'),
      pageSize: z.number().optional().describe('Results per page'),
      filterOrderId: z.string().optional().describe('Filter by order ID'),
      filterStatus: z
        .string()
        .optional()
        .describe(
          'Filter by payment status (e.g. payment_due, paid, partially_paid, overpaid)'
        ),
      sort: z.string().optional().describe('Sort field')
    })
  )
  .output(
    z.object({
      payments: z.array(z.record(z.string(), z.any())).describe('List of payment records'),
      totalCount: z.number().optional().describe('Total number of matching payments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(buildClientConfig(ctx));

    let filters: Record<string, string> = {};
    if (ctx.input.filterOrderId) filters.order_id = ctx.input.filterOrderId;
    if (ctx.input.filterStatus) filters.status = ctx.input.filterStatus;

    let response = await client.listPayments({
      pagination: {
        pageNumber: ctx.input.pageNumber,
        pageSize: ctx.input.pageSize
      },
      filters,
      sort: ctx.input.sort
    });

    let payments = flattenResourceList(response);

    return {
      output: {
        payments,
        totalCount: response?.meta?.total_count
      },
      message: `Found ${payments.length} payment(s).`
    };
  })
  .build();
