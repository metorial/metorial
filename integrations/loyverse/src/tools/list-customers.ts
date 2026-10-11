import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, joinIds } from '../lib/client';
import { customerSchema, mapCustomer, phoneMatches } from '../lib/customers';
import { spec } from '../spec';

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `Retrieve customer records from Loyverse, newest first. Supports filtering by customer IDs, email, and created/updated date ranges for syncing customer data. Returns paginated results.`,
  instructions: [
    'Use email to look up a customer directly. Phone number matching is applied to the returned page only, so keep paging with the cursor if no match is found.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(250)
        .optional()
        .describe('Number of customers to return (1-250, default 50)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      customerIds: z
        .array(z.string())
        .optional()
        .describe('Only return customers with these IDs'),
      email: z.string().optional().describe('Filter by exact email address'),
      phoneNumber: z
        .string()
        .optional()
        .describe(
          'Only keep customers whose phone number matches (digits compared); applied to the returned page'
        ),
      createdAtMin: z
        .string()
        .optional()
        .describe('Filter customers created at or after this ISO 8601 UTC timestamp'),
      createdAtMax: z
        .string()
        .optional()
        .describe('Filter customers created at or before this ISO 8601 UTC timestamp'),
      updatedAtMin: z
        .string()
        .optional()
        .describe('Filter customers updated at or after this ISO 8601 UTC timestamp'),
      updatedAtMax: z
        .string()
        .optional()
        .describe('Filter customers updated at or before this ISO 8601 UTC timestamp'),
      showDeleted: z
        .boolean()
        .optional()
        .describe('Include customers pending permanent deletion')
    })
  )
  .output(
    z.object({
      customers: z.array(customerSchema).describe('List of customers'),
      cursor: z.string().nullable().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listCustomers({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      customerIds: joinIds(ctx.input.customerIds),
      email: ctx.input.email,
      createdAtMin: ctx.input.createdAtMin,
      createdAtMax: ctx.input.createdAtMax,
      updatedAtMin: ctx.input.updatedAtMin,
      updatedAtMax: ctx.input.updatedAtMax,
      showDeleted: ctx.input.showDeleted
    });

    let phoneNumber = ctx.input.phoneNumber;
    let customers = (result.customers ?? [])
      .filter((c: any) => !phoneNumber || phoneMatches(c.phone_number, phoneNumber))
      .map(mapCustomer);

    return {
      output: { customers, cursor: result.cursor },
      message: `Retrieved **${customers.length}** customer(s).${result.cursor ? ' More available via cursor.' : ''}`
    };
  })
  .build();
