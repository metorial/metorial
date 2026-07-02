import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `Search and filter customer records in your DPD account. Supports filtering by email, name, product purchased, newsletter subscription status, and creation date range. Results are paginated at 100 records per page.`,
  instructions: [
    'Email and name filters use starts-with matching and are case-insensitive.',
    'Date filters accept PHP strtotime formats like "2024-01-01", "last month", etc.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z
        .string()
        .optional()
        .describe('Filter by email address (starts-with match, case-insensitive)'),
      firstName: z
        .string()
        .optional()
        .describe('Filter by first name (starts-with match, case-insensitive)'),
      lastName: z
        .string()
        .optional()
        .describe('Filter by last name (starts-with match, case-insensitive)'),
      productId: z
        .number()
        .optional()
        .describe('Filter by product ID (customers who purchased this product)'),
      receivesNewsletters: z
        .boolean()
        .optional()
        .describe('Filter by newsletter subscription status'),
      dateMin: z.string().optional().describe('Minimum creation date (PHP strtotime format)'),
      dateMax: z.string().optional().describe('Maximum creation date (PHP strtotime format)'),
      page: z.number().optional().describe('Page number for pagination (100 records per page)')
    })
  )
  .output(
    z.object({
      customers: z.array(
        z.object({
          customerId: z.number().describe('Unique customer ID'),
          status: z.string().describe('Customer status')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let customers = await client.listCustomers(ctx.input);

    return {
      output: { customers },
      message: `Found **${customers.length}** customer(s)${ctx.input.page ? ` on page ${ctx.input.page}` : ''}.`
    };
  })
  .build();
