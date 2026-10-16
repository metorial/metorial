import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import {
  FinmeiClient,
  optionalString,
  optionalTimestamp,
  pagination,
  readList,
  requireId
} from '../lib/client';
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
      page: z.number().optional().describe('Page number for pagination (1-based)'),
      perPage: z
        .number()
        .optional()
        .describe('Number of customers per page (the provider may use a fixed page size)'),
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
      rawResponse: z.any().optional().describe('Complete provider response'),
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

    let customers = readList(result, 'customers').map(c => ({
      customerId: requireId(c.id, 'customer ID'),
      ...pickDefined({
        name: optionalString(c.name, 'customer name'),
        email: optionalString(c.email, 'customer email'),
        phone: optionalString(c.phone, 'customer phone'),
        createdAt: optionalTimestamp(c.created_at, 'customer creation time')
      })
    }));

    let metadata = pagination(result);
    return {
      output: {
        customers,
        ...metadata,
        rawResponse: result
      },
      message: `Found **${customers.length}** customer(s)${metadata.total !== undefined ? ` out of ${metadata.total} total` : ''}.`
    };
  })
  .build();
