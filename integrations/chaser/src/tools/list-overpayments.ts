import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { overpaymentOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listOverpayments = SlateTool.create(spec, {
  name: 'List Overpayments',
  key: 'list_overpayments',
  description: `List overpayments in Chaser with optional filtering and pagination. Filter by overpayment ID, currency, customer, amounts, and date.`,
  instructions: ['Filters use operators like "[eq]", "[in]", "[gte]", "[lte]", etc.'],
  constraints: ['Maximum 100 results per page.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().default(0).describe('Page number (starts at 0)'),
      limit: z.number().optional().default(100).describe('Results per page (max 100)'),
      filters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Filter parameters (e.g. { "customer_external_id[eq]": "CUST-001" })')
    })
  )
  .output(
    z.object({
      pageNumber: z.number().describe('Current page number'),
      pageSize: z.number().describe('Results per page'),
      totalCount: z.number().describe('Total matching overpayments'),
      overpayments: z.array(overpaymentOutputSchema).describe('List of overpayments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listOverpayments({
      page: ctx.input.page,
      limit: ctx.input.limit,
      filters: ctx.input.filters
    });

    let overpayments = result.data.map((op: any) => ({
      overpaymentInternalId: op.id || '',
      overpaymentId: op.overpaymentId || '',
      remainingCredit: op.remainingCredit ?? 0,
      date: op.date || '',
      status: op.status || '',
      total: op.total ?? 0,
      currencyCode: op.currencyCode || '',
      customerExternalId: op.customerExternalId || '',
      customerName: op.customerName ?? null
    }));

    return {
      output: {
        pageNumber: result.pageNumber,
        pageSize: result.pageSize,
        totalCount: result.totalCount,
        overpayments
      },
      message: `Found **${result.totalCount}** overpayments (showing page ${result.pageNumber}, ${overpayments.length} results).`
    };
  })
  .build();
