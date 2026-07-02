import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchCustomers = SlateTool.create(spec, {
  name: 'Search Customers',
  key: 'search_customers',
  description: `Search and list customers in AgencyZoom. Filter by search term, customer type, date range, and paginate through results. Returns a summary list of matching customers with basic contact information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe('Search term to filter customers by name, email, phone, or company'),
      type: z.enum(['personal', 'commercial']).optional().describe('Filter by customer type'),
      fromDate: z
        .string()
        .optional()
        .describe(
          'Filter customers created on or after this date (ISO 8601 format, e.g. "2024-01-01")'
        ),
      toDate: z
        .string()
        .optional()
        .describe(
          'Filter customers created on or before this date (ISO 8601 format, e.g. "2024-12-31")'
        ),
      offset: z.number().optional().describe('Number of records to skip for pagination'),
      limit: z.number().optional().describe('Maximum number of records to return')
    })
  )
  .output(
    z.object({
      customers: z
        .array(
          z.object({
            customerId: z.string().describe('Unique identifier for the customer'),
            firstName: z.string().describe('Customer first name'),
            lastName: z.string().describe('Customer last name'),
            companyName: z
              .string()
              .optional()
              .describe('Company name for commercial customers'),
            email: z.string().optional().describe('Customer primary email address'),
            phone: z.string().optional().describe('Customer primary phone number'),
            type: z.string().optional().describe('Customer type: personal or commercial'),
            createdAt: z.string().optional().describe('Date the customer record was created')
          })
        )
        .describe('Array of matching customer records'),
      total: z.number().describe('Total number of customers matching the search criteria')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let params: Record<string, any> = {};
    if (ctx.input.search !== undefined) params.search = ctx.input.search;
    if (ctx.input.type !== undefined) params.type = ctx.input.type;
    if (ctx.input.fromDate !== undefined) params.fromDate = ctx.input.fromDate;
    if (ctx.input.toDate !== undefined) params.toDate = ctx.input.toDate;
    if (ctx.input.offset !== undefined) params.offset = ctx.input.offset;
    if (ctx.input.limit !== undefined) params.limit = ctx.input.limit;

    let result = await client.searchCustomers(params);

    let customers = (result.customers || result.data || result || []).map((c: any) => ({
      customerId: c.customerId || c.id || '',
      firstName: c.firstName || '',
      lastName: c.lastName || '',
      companyName: c.companyName,
      email: c.email,
      phone: c.phone,
      type: c.type,
      createdAt: c.createdAt
    }));

    let total = result.total ?? result.totalCount ?? customers.length;

    return {
      output: { customers, total },
      message: `Found **${total}** customer(s)${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}.${customers.length > 0 ? ` Showing ${customers.length} result(s).` : ''}`
    };
  })
  .build();
