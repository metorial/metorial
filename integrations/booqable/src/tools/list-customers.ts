import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildClientConfig, flattenResourceList } from '../lib/helpers';
import { spec } from '../spec';

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `Search and list customers in your Booqable account. Supports filtering by name, email, archived status, and more. Returns paginated results with customer details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageNumber: z.number().optional().describe('Page number to retrieve (starts at 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (default 25, max 100)'),
      filterName: z.string().optional().describe('Filter by customer name'),
      filterEmail: z.string().optional().describe('Filter by customer email'),
      filterArchived: z.boolean().optional().describe('Filter by archived status'),
      sort: z
        .string()
        .optional()
        .describe('Sort field (prefix with - for descending, e.g. "-created_at")')
    })
  )
  .output(
    z.object({
      customers: z.array(z.record(z.string(), z.any())).describe('List of customer records'),
      totalCount: z.number().optional().describe('Total number of matching customers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(buildClientConfig(ctx));

    let filters: Record<string, string> = {};
    if (ctx.input.filterName) filters.name = ctx.input.filterName;
    if (ctx.input.filterEmail) filters.email = ctx.input.filterEmail;
    if (ctx.input.filterArchived !== undefined)
      filters.archived = String(ctx.input.filterArchived);

    let response = await client.listCustomers({
      pagination: {
        pageNumber: ctx.input.pageNumber,
        pageSize: ctx.input.pageSize
      },
      filters,
      sort: ctx.input.sort,
      include: ['properties']
    });

    let customers = flattenResourceList(response);

    return {
      output: {
        customers,
        totalCount: response?.meta?.total_count
      },
      message: `Found ${customers.length} customer(s).`
    };
  })
  .build();
