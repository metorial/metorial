import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `Retrieve customers tracked through the conversion funnel. Filter by email, external ID, country, referral link, or search query. Returns customer details with sales data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter by exact email address'),
      externalId: z.string().optional().describe('Filter by external customer ID'),
      search: z.string().optional().describe('Search by email, external ID, or name'),
      country: z.string().optional().describe('Filter by 2-letter country code'),
      linkId: z.string().optional().describe('Filter by referral link ID'),
      sortBy: z
        .enum(['createdAt', 'saleAmount', 'firstSaleAt'])
        .optional()
        .describe('Sort field'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      startingAfter: z
        .string()
        .optional()
        .describe('Return records after this ID; mutually exclusive with endingBefore'),
      endingBefore: z
        .string()
        .optional()
        .describe('Return records before this ID; mutually exclusive with startingAfter'),
      page: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Items per page (max 100)')
    })
  )
  .output(
    z.object({
      customers: z
        .array(
          z.object({
            customerId: z.string(),
            name: z.string().nullable(),
            externalId: z.string(),
            email: z.string().nullable(),
            avatar: z.string().nullable(),
            country: z.string().nullable(),
            sales: z.number().optional(),
            saleAmount: z.number().optional(),
            createdAt: z.string()
          })
        )
        .describe('List of customers'),
      count: z.number().describe('Number of customers returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let customers = await client.listCustomers({
      email: ctx.input.email,
      externalId: ctx.input.externalId,
      search: ctx.input.search,
      country: ctx.input.country,
      linkId: ctx.input.linkId,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      startingAfter: ctx.input.startingAfter,
      endingBefore: ctx.input.endingBefore,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        customers: customers.map(c => ({
          customerId: c.id,
          name: c.name ?? null,
          externalId: c.externalId,
          email: c.email ?? null,
          avatar: c.avatar ?? null,
          country: c.country ?? null,
          sales: c.sales ?? undefined,
          saleAmount: c.saleAmount ?? undefined,
          createdAt: c.createdAt
        })),
        count: customers.length
      },
      message: `Found **${customers.length}** customers`
    };
  })
  .build();
