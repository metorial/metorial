import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildClientConfig, flattenResourceList, getTotalCount } from '../lib/helpers';
import { spec } from '../spec';

export let listPayments = SlateTool.create(spec, {
  name: 'List Payments',
  key: 'list_payments',
  description: `List payments including charges, authorizations, and refunds. Filter by order on the server. Status filtering applies only to the selected page; totalCount is omitted when a status is supplied.`,
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
          'Filter the selected page by payment lifecycle status, for example succeeded, created, or failed'
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

    let response = await client.listPayments({
      pagination: {
        pageNumber: ctx.input.pageNumber,
        pageSize: ctx.input.pageSize
      },
      filters,
      sort: ctx.input.sort
    });

    let payments = flattenResourceList(response);
    if (ctx.input.filterStatus)
      payments = payments.filter(payment => payment.status === ctx.input.filterStatus);

    return {
      output: {
        payments,
        totalCount: ctx.input.filterStatus ? undefined : getTotalCount(response)
      },
      message: `Found ${payments.length} payment(s) on the selected page${ctx.input.filterStatus ? ` matching status ${ctx.input.filterStatus}` : ''}.`
    };
  })
  .build();
