import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let customerSummarySchema = z.object({
  customerId: z.number(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  username: z.string(),
  role: z.string(),
  ordersCount: z.number(),
  totalSpent: z.string(),
  avatarUrl: z.string(),
  dateCreated: z.string()
});

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `Search and list customer records. Filter by email, role, or search term. Returns customer summaries with order count and total spent.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().default(1).describe('Page number'),
      perPage: z.number().optional().default(10).describe('Results per page, max 100'),
      search: z.string().optional().describe('Search customers by name or email'),
      email: z.string().optional().describe('Filter by exact email address'),
      role: z
        .enum([
          'all',
          'administrator',
          'editor',
          'author',
          'contributor',
          'subscriber',
          'customer',
          'shop_manager'
        ])
        .optional()
        .describe('Filter by role'),
      orderby: z
        .enum(['id', 'include', 'name', 'registered_date'])
        .optional()
        .describe('Sort by field'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      customers: z.array(customerSummarySchema),
      page: z.number(),
      perPage: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let params: Record<string, any> = {
      page: ctx.input.page,
      per_page: ctx.input.perPage
    };

    if (ctx.input.search) params.search = ctx.input.search;
    if (ctx.input.email) params.email = ctx.input.email;
    if (ctx.input.role) params.role = ctx.input.role;
    if (ctx.input.orderby) params.orderby = ctx.input.orderby;
    if (ctx.input.order) params.order = ctx.input.order;

    let customers = await client.listCustomers(params);

    let mapped = customers.map((c: any) => ({
      customerId: c.id,
      email: c.email || '',
      firstName: c.first_name || '',
      lastName: c.last_name || '',
      username: c.username || '',
      role: c.role || '',
      ordersCount: c.orders_count || 0,
      totalSpent: c.total_spent || '0',
      avatarUrl: c.avatar_url || '',
      dateCreated: c.date_created || ''
    }));

    return {
      output: {
        customers: mapped,
        page: ctx.input.page || 1,
        perPage: ctx.input.perPage || 10
      },
      message: `Found **${mapped.length}** customers (page ${ctx.input.page || 1}).`
    };
  })
  .build();
