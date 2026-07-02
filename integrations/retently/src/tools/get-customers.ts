import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let attributeFilterSchema = z.object({
  name: z.string().describe('Customer property name to filter by'),
  operator: z
    .enum([
      'equal',
      'not_equal',
      'exists',
      'not_exists',
      'in',
      'not_in',
      'contains',
      'not_contains',
      'greater_than',
      'less_than',
      'greater_than_ago',
      'less_than_ago'
    ])
    .describe('Filter operator'),
  value: z
    .union([z.string(), z.number(), z.boolean()])
    .optional()
    .describe('Filter value (not needed for exists/not_exists)')
});

export let getCustomers = SlateTool.create(spec, {
  name: 'Get Customers',
  key: 'get_customers',
  description: `Retrieve customers from Retently. Look up a single customer by ID or email, or list customers with pagination, date range filtering, and custom attribute filters.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z
        .string()
        .optional()
        .describe('Retrieve a specific customer by their Retently ID'),
      email: z.string().optional().describe('Filter customers by exact email address'),
      page: z.number().optional().describe('Page number (default: 1)'),
      limit: z.number().optional().describe('Items per page (default: 20, max: 1000)'),
      sort: z
        .string()
        .optional()
        .describe('Sort field, prefix with - for descending (default: -createdDate)'),
      startDate: z
        .string()
        .optional()
        .describe('Filter customers created after this date (ISO 8601 or UNIX timestamp)'),
      endDate: z
        .string()
        .optional()
        .describe('Filter customers created before this date (ISO 8601 or UNIX timestamp)'),
      attributes: z
        .array(attributeFilterSchema)
        .optional()
        .describe('Filter by custom customer properties'),
      match: z
        .enum(['all', 'any'])
        .optional()
        .describe('Match all or any attribute filters (default: all)')
    })
  )
  .output(
    z.object({
      subscribers: z.array(z.any()).optional().describe('List of customer records'),
      page: z.number().optional().describe('Current page number'),
      pages: z.number().optional().describe('Total number of pages'),
      total: z.number().optional().describe('Total number of customers matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.customerId) {
      let data = await client.getCustomer(ctx.input.customerId);
      return {
        output: data,
        message: `Retrieved customer **${ctx.input.customerId}**.`
      };
    }

    let data = await client.getCustomers({
      email: ctx.input.email,
      page: ctx.input.page,
      limit: ctx.input.limit,
      sort: ctx.input.sort,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      attributes: ctx.input.attributes,
      match: ctx.input.match
    });

    let total = data.total ?? data.subscribers?.length ?? 0;
    return {
      output: data,
      message: `Retrieved **${total}** customer(s) (page ${data.page ?? 1} of ${data.pages ?? 1}).`
    };
  })
  .build();
