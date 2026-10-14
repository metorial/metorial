import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description:
    'List customers with their IDs, contact details, tags, custom attributes, and subscription status. Filter by creation or modification dates and subscription status. Requires an API key with read customers access.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number, starting at 1'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of customers per page, between 1 and 250; defaults to 100'),
      createdAfter: z
        .string()
        .optional()
        .describe('Creation date lower bound as a YYYY-MM-DD date or ISO 8601 timestamp'),
      createdBefore: z
        .string()
        .optional()
        .describe('Creation date upper bound as a YYYY-MM-DD date or ISO 8601 timestamp'),
      modifiedAfter: z
        .string()
        .optional()
        .describe('Modification date lower bound as a YYYY-MM-DD date or ISO 8601 timestamp'),
      modifiedBefore: z
        .string()
        .optional()
        .describe('Modification date upper bound as a YYYY-MM-DD date or ISO 8601 timestamp'),
      subscribed: z
        .boolean()
        .optional()
        .describe(
          'Filter by subscription status; omit for both subscribed and unsubscribed customers'
        )
    })
  )
  .output(
    z.object({
      totalCount: z.number(),
      nextPageUrl: z.string().nullable(),
      previousPageUrl: z.string().nullable(),
      customers: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Customer records, including their id for get_customer')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listCustomers(ctx.input);
    return {
      output: {
        totalCount: result.count,
        nextPageUrl: result.next,
        previousPageUrl: result.previous,
        customers: result.results
      },
      message: `Found ${result.count} customer(s). Returned ${result.results.length} on this page.`
    };
  })
  .build();
