import { SlateTool } from 'slates';
import { z } from 'zod';
import { PayhereClient } from '../lib/client';
import { spec } from '../spec';

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `Retrieve a paginated list of customers, ordered chronologically with most recent first. Customers are created automatically when they make a payment.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z
        .number()
        .optional()
        .describe('Number of records per page (default: 20, max: 100)')
    })
  )
  .output(
    z.object({
      raw: z.record(z.string(), z.unknown()).optional().describe('Original provider data'),
      customers: z.array(
        z.object({
          raw: z.record(z.string(), z.unknown()).optional().describe('Original provider data'),
          customerId: z.number().describe('Customer identifier'),
          name: z.string().describe('Customer name'),
          email: z.string().describe('Customer email'),
          ipAddress: z.string().nullable().describe('IP address at time of payment'),
          location: z
            .string()
            .nullable()
            .describe('Geographic location; structured provider values are JSON-encoded'),
          locationDetails: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Structured geographic location supplied by Payhere'),
          payments: z
            .array(z.record(z.string(), z.unknown()))
            .optional()
            .describe('Payment history returned for this customer'),
          subscriptions: z
            .array(z.record(z.string(), z.unknown()))
            .optional()
            .describe('Subscriptions returned for this customer'),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      meta: z.object({
        raw: z.record(z.string(), z.unknown()).optional().describe('Original provider data'),
        currentPage: z.number(),
        nextPage: z.number().nullable(),
        prevPage: z.number().nullable(),
        totalPages: z.number(),
        totalCount: z.number()
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayhereClient({ token: ctx.auth.token });

    let result = await client.listCustomers({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    return {
      output: result,
      message: `Found **${result.customers.length}** customers (page ${result.meta.currentPage} of ${result.meta.totalPages}, ${result.meta.totalCount} total).`
    };
  })
  .build();
