import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCustomersTool = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `Retrieve customers from your Lemon Squeezy store. Supports filtering by store ID or email and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      storeId: z.string().optional().describe('Filter by store ID'),
      email: z.string().optional().describe('Filter by customer email address'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      customers: z.array(
        z.object({
          customerId: z.string(),
          storeId: z.number(),
          name: z.string(),
          email: z.string(),
          status: z.string(),
          statusFormatted: z.string(),
          city: z.string().nullable(),
          region: z.string().nullable(),
          country: z.string().nullable(),
          totalRevenueCurrency: z.number(),
          mrr: z.number(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listCustomers({
      storeId: ctx.input.storeId,
      email: ctx.input.email,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let customers = (response.data || []).map((customer: any) => ({
      customerId: customer.id,
      storeId: customer.attributes.store_id,
      name: customer.attributes.name,
      email: customer.attributes.email,
      status: customer.attributes.status,
      statusFormatted: customer.attributes.status_formatted,
      city: customer.attributes.city,
      region: customer.attributes.region,
      country: customer.attributes.country,
      totalRevenueCurrency: customer.attributes.total_revenue_currency,
      mrr: customer.attributes.mrr,
      createdAt: customer.attributes.created_at,
      updatedAt: customer.attributes.updated_at
    }));

    let hasMore =
      !!response.meta?.page?.lastPage &&
      response.meta?.page?.currentPage < response.meta?.page?.lastPage;

    return {
      output: { customers, hasMore },
      message: `Found **${customers.length}** customer(s).`
    };
  })
  .build();
