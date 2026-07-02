import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `Retrieve a paginated list of customers, with optional filtering by business, email, custom ID, job ID, or subscription status. Optionally includes feedback history for each customer.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      businessId: z
        .string()
        .optional()
        .describe('Filter by business ID (supports comma-separated multiple IDs)'),
      email: z.string().optional().describe('Filter by customer email'),
      customId: z.string().optional().describe('Filter by custom identifier'),
      jobId: z.string().optional().describe('Filter by job identifier'),
      page: z.number().optional().describe('Page number (max 500 results per page)'),
      includeHistory: z
        .boolean()
        .optional()
        .describe('Include feedback history for each customer')
    })
  )
  .output(
    z.object({
      customers: z
        .array(
          z.object({
            customerId: z.number().optional().describe('Customer ID'),
            businessId: z.number().optional().describe('Associated business ID'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            email: z.string().optional().describe('Email address'),
            phone: z.string().optional().describe('Phone number'),
            jobId: z.string().optional().describe('Job identifier'),
            customId: z.string().optional().describe('Custom identifier'),
            rating: z.any().optional().describe('Customer rating'),
            review: z.string().optional().describe('Customer review text'),
            subscription: z.any().optional().describe('Subscription status'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of customers'),
      page: z.number().describe('Current page'),
      pages: z.number().describe('Total pages'),
      totalCount: z.number().describe('Total customer count')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.listCustomers({
      businessId: ctx.input.businessId,
      email: ctx.input.email,
      customId: ctx.input.customId,
      jobId: ctx.input.jobId,
      page: ctx.input.page,
      showHistory: ctx.input.includeHistory ? 1 : 0
    });

    let count =
      typeof data.count === 'number' ? data.count : Number.parseInt(data.count || '0', 10);
    let customers: Record<string, unknown>[] = [];

    for (let i = 1; i <= count; i++) {
      customers.push({
        customerId: data[`id${i}`],
        businessId: data[`businessId${i}`],
        firstName: data[`firstName${i}`],
        lastName: data[`lastName${i}`],
        email: data[`email${i}`],
        phone: data[`phone${i}`],
        jobId: data[`jobId${i}`],
        customId: data[`customId${i}`],
        rating: data[`rating${i}`],
        review: data[`review${i}`],
        subscription: data[`subscription${i}`],
        createdAt: data[`createdAt${i}`]
      });
    }

    return {
      output: {
        customers,
        page: data.page ?? 1,
        pages: data.pages ?? 1,
        totalCount: count
      } as any,
      message: `Found **${count}** customer(s) (page ${data.page ?? 1} of ${data.pages ?? 1}).`
    };
  })
  .build();
