import { SlateTool } from 'slates';
import { z } from 'zod';
import { MagentoClient } from '../lib/client';
import { spec } from '../spec';

let filterSchema = z.object({
  field: z
    .string()
    .describe(
      'Field to filter by (e.g. email, firstname, lastname, group_id, created_at, website_id)'
    ),
  value: z.string().describe('Value to compare against'),
  conditionType: z
    .string()
    .optional()
    .describe('Comparison: eq, neq, gt, gteq, lt, lteq, like, in, nin (default: eq)')
});

export let searchCustomers = SlateTool.create(spec, {
  name: 'Search Customers',
  key: 'search_customers',
  description: `Search and filter customer accounts using flexible criteria. Find customers by email, name, group, registration date, or any customer field. Supports pagination and sorting.`,
  instructions: [
    'Use `email` with `eq` to find a specific customer by email.',
    'Use `like` condition type with `%value%` for partial name matching.',
    'Use `created_at` with `gt`/`lt` for date range queries.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filters: z.array(filterSchema).optional().describe('Search filters'),
      sortField: z.string().optional().describe('Field to sort by'),
      sortDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      pageSize: z.number().optional().describe('Number of results per page (default: 20)'),
      currentPage: z.number().optional().describe('Page number (1-based)')
    })
  )
  .output(
    z.object({
      customers: z
        .array(
          z.object({
            customerId: z.number().optional().describe('Customer ID'),
            email: z.string().optional().describe('Customer email'),
            firstname: z.string().optional().describe('First name'),
            lastname: z.string().optional().describe('Last name'),
            groupId: z.number().optional().describe('Customer group ID'),
            websiteId: z.number().optional().describe('Website ID'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of matching customers'),
      totalCount: z.number().describe('Total number of matching customers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MagentoClient({
      storeUrl: ctx.config.storeUrl,
      storeCode: ctx.config.storeCode,
      token: ctx.auth.token
    });

    let result = await client.searchCustomers({
      filters: ctx.input.filters,
      sortField: ctx.input.sortField,
      sortDirection: ctx.input.sortDirection,
      pageSize: ctx.input.pageSize || 20,
      currentPage: ctx.input.currentPage
    });

    return {
      output: {
        customers: result.items.map(c => ({
          customerId: c.id,
          email: c.email,
          firstname: c.firstname,
          lastname: c.lastname,
          groupId: c.group_id,
          websiteId: c.website_id,
          createdAt: c.created_at,
          updatedAt: c.updated_at
        })),
        totalCount: result.total_count
      },
      message: `Found **${result.total_count}** customers (showing ${result.items.length}).`
    };
  })
  .build();
