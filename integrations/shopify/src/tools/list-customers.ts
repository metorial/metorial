import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { spec } from '../spec';

let customerSummarySchema = z.object({
  customerId: z.string(),
  email: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  phone: z.string().nullable(),
  ordersCount: z.number(),
  totalSpent: z.string(),
  state: z.string(),
  tags: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  verifiedEmail: z.boolean()
});

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `List or search customers in the Shopify store. Filter by date range or search with a query string that matches against multiple customer fields.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(250)
        .optional()
        .describe('Number of customers to return (max 250)'),
      query: z
        .string()
        .optional()
        .describe(
          'Search query (searches name, email, etc.). When provided, other filters are ignored.'
        ),
      createdAtMin: z
        .string()
        .optional()
        .describe('Show customers created after this date (ISO 8601)'),
      createdAtMax: z
        .string()
        .optional()
        .describe('Show customers created before this date (ISO 8601)'),
      updatedAtMin: z
        .string()
        .optional()
        .describe('Show customers updated after this date (ISO 8601)'),
      updatedAtMax: z
        .string()
        .optional()
        .describe('Show customers updated before this date (ISO 8601)'),
      sinceId: z.string().optional().describe('Show customers after this ID for pagination'),
      ids: z.string().optional().describe('Comma-separated list of customer IDs')
    })
  )
  .output(
    z.object({
      customers: z.array(customerSummarySchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShopifyClient({
      token: ctx.auth.token,
      shopDomain: ctx.config.shopDomain,
      apiVersion: ctx.config.apiVersion
    });

    let customers: any[];

    if (ctx.input.query) {
      customers = await client.searchCustomers(ctx.input.query, { limit: ctx.input.limit });
    } else {
      customers = await client.listCustomers({
        limit: ctx.input.limit,
        createdAtMin: ctx.input.createdAtMin,
        createdAtMax: ctx.input.createdAtMax,
        updatedAtMin: ctx.input.updatedAtMin,
        updatedAtMax: ctx.input.updatedAtMax,
        sinceId: ctx.input.sinceId,
        ids: ctx.input.ids
      });
    }

    let mapped = customers.map((c: any) => ({
      customerId: String(c.id),
      email: c.email,
      firstName: c.first_name,
      lastName: c.last_name,
      phone: c.phone,
      ordersCount: c.orders_count,
      totalSpent: c.total_spent,
      state: c.state,
      tags: c.tags || '',
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      verifiedEmail: c.verified_email
    }));

    return {
      output: { customers: mapped },
      message: `Found **${mapped.length}** customer(s).`
    };
  })
  .build();
