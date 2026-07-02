import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinmeiClient } from '../lib/client';
import { spec } from '../spec';

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `Retrieve a paginated list of customers from Finmei. Supports filtering by name or email, and sorting.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      perPage: z
        .number()
        .optional()
        .describe('Number of customers per page (default: 20, max: 100)'),
      search: z.string().optional().describe('Filter by name or email'),
      sort: z
        .string()
        .optional()
        .describe('Sort field and direction (e.g., "name_asc", "created_at_desc")')
    })
  )
  .output(
    z.object({
      customers: z
        .array(
          z.object({
            customerId: z.string().describe('Customer ID'),
            name: z.string().optional().describe('Customer name'),
            email: z.string().optional().describe('Customer email'),
            phone: z.string().optional().describe('Customer phone'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of customers'),
      total: z.number().optional().describe('Total number of customers'),
      page: z.number().optional().describe('Current page number'),
      totalPages: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinmeiClient(ctx.auth.token);

    let result = await client.listCustomers({
      page: ctx.input.page,
      per_page: ctx.input.perPage,
      search: ctx.input.search,
      sort: ctx.input.sort
    });

    let rawCustomers = result?.data ?? result?.customers ?? result ?? [];
    let customersArray = Array.isArray(rawCustomers) ? rawCustomers : [];

    let customers = customersArray.map((c: any) => ({
      customerId: String(c.id),
      name: c.name,
      email: c.email,
      phone: c.phone,
      createdAt: c.created_at
    }));

    let total = result?.total ?? result?.meta?.total;
    let page = result?.page ?? result?.meta?.current_page ?? ctx.input.page;
    let totalPages = result?.total_pages ?? result?.meta?.last_page;

    return {
      output: {
        customers,
        total,
        page,
        totalPages
      },
      message: `Found **${customers.length}** customer(s)${total ? ` out of ${total} total` : ''}.`
    };
  })
  .build();
