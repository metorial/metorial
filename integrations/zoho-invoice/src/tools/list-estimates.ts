import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEstimates = SlateTool.create(spec, {
  name: 'List Estimates',
  key: 'list_estimates',
  description: `List and search estimates in Zoho Invoice. Supports filtering by status, customer, date range, and total amount. Returns paginated results with estimate details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['sent', 'draft', 'invoiced', 'accepted', 'declined', 'expired'])
        .optional()
        .describe('Filter by estimate status'),
      customerName: z.string().optional().describe('Filter by customer name'),
      estimateNumber: z.string().optional().describe('Filter by estimate number'),
      date: z.string().optional().describe('Filter by estimate date (YYYY-MM-DD)'),
      expiryDate: z.string().optional().describe('Filter by expiry date (YYYY-MM-DD)'),
      total: z.number().optional().describe('Filter by total amount'),
      searchText: z
        .string()
        .optional()
        .describe('Search estimates by text across multiple fields'),
      sortColumn: z
        .string()
        .optional()
        .describe('Column to sort results by (e.g. "estimate_number", "date", "total")'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z.number().optional().describe('Number of estimates per page (max 200)')
    })
  )
  .output(
    z.object({
      estimates: z
        .array(
          z.object({
            estimateId: z.string().describe('Unique estimate ID'),
            estimateNumber: z.string().optional().describe('Estimate number'),
            status: z.string().optional().describe('Estimate status'),
            customerName: z.string().optional().describe('Customer display name'),
            customerId: z.string().optional().describe('Customer/contact ID'),
            date: z.string().optional().describe('Estimate date'),
            expiryDate: z.string().optional().describe('Expiry date'),
            total: z.number().optional().describe('Total amount'),
            createdTime: z
              .string()
              .optional()
              .describe('ISO timestamp when the estimate was created')
          })
        )
        .describe('Array of estimates matching the query'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Number of results per page'),
      hasMorePages: z.boolean().describe('Whether additional pages of results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      region: ctx.auth.region
    });

    let params: Record<string, any> = {};
    if (ctx.input.status !== undefined) params.status = ctx.input.status;
    if (ctx.input.customerName !== undefined) params.customer_name = ctx.input.customerName;
    if (ctx.input.estimateNumber !== undefined)
      params.estimate_number = ctx.input.estimateNumber;
    if (ctx.input.date !== undefined) params.date = ctx.input.date;
    if (ctx.input.expiryDate !== undefined) params.expiry_date = ctx.input.expiryDate;
    if (ctx.input.total !== undefined) params.total = ctx.input.total;
    if (ctx.input.searchText !== undefined) params.search_text = ctx.input.searchText;
    if (ctx.input.sortColumn !== undefined) params.sort_column = ctx.input.sortColumn;
    if (ctx.input.page !== undefined) params.page = ctx.input.page;
    if (ctx.input.perPage !== undefined) params.per_page = ctx.input.perPage;

    let result = await client.listEstimates(params);

    let estimates = (result.estimates || []).map((e: any) => ({
      estimateId: e.estimate_id,
      estimateNumber: e.estimate_number,
      status: e.status,
      customerName: e.customer_name,
      customerId: e.customer_id,
      date: e.date,
      expiryDate: e.expiry_date,
      total: e.total,
      createdTime: e.created_time
    }));

    let pageContext = result.pageContext || {};

    return {
      output: {
        estimates,
        page: pageContext.page || 1,
        perPage: pageContext.per_page || 25,
        hasMorePages: pageContext.has_more_page || false
      },
      message: `Found **${estimates.length}** estimate(s) (page ${pageContext.page || 1}).${pageContext.has_more_page ? ' More pages available.' : ''}`
    };
  })
  .build();
