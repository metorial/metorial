import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';
import { customerOutputSchema, mapCustomer } from './shared';

export let searchCustomers = SlateTool.create(spec, {
  name: 'Search Customers',
  key: 'search_customers',
  description:
    'Search Square customer profiles using common filters or an advanced Square customer query object. Newly created or updated customers can take time to appear in search results.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      emailAddressFuzzy: z
        .string()
        .optional()
        .describe('Fuzzy match against customer email_address'),
      phoneNumberFuzzy: z
        .string()
        .optional()
        .describe('Fuzzy match against customer phone_number'),
      createdAtStartAt: z
        .string()
        .optional()
        .describe('Filter customers created at or after this RFC 3339 timestamp'),
      createdAtEndAt: z
        .string()
        .optional()
        .describe('Filter customers created before this RFC 3339 timestamp'),
      groupIdsAll: z
        .array(z.string())
        .optional()
        .describe('Return customers that belong to all of these customer group IDs'),
      creationSourceValues: z
        .array(z.string())
        .optional()
        .describe('Filter by Square customer creation_source values'),
      sortField: z.enum(['DEFAULT', 'CREATED_AT']).optional().describe('Customer sort field'),
      sortOrder: z.enum(['ASC', 'DESC']).optional().describe('Customer sort order'),
      query: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Advanced Square CustomerQuery object. Convenience filters are merged into this query.'
        ),
      count: z
        .boolean()
        .optional()
        .describe('Whether Square should return the total match count'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      limit: z.number().optional().describe('Maximum number of results per page (1-100)')
    })
  )
  .output(
    z.object({
      customers: z.array(customerOutputSchema),
      cursor: z.string().optional(),
      count: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let query: Record<string, any> = ctx.input.query ? { ...ctx.input.query } : {};
    let filter = { ...(query.filter ?? {}) };

    if (ctx.input.emailAddressFuzzy) {
      filter.email_address = { fuzzy: ctx.input.emailAddressFuzzy };
    }
    if (ctx.input.phoneNumberFuzzy) {
      filter.phone_number = { fuzzy: ctx.input.phoneNumberFuzzy };
    }
    if (ctx.input.createdAtStartAt || ctx.input.createdAtEndAt) {
      filter.created_at = {
        start_at: ctx.input.createdAtStartAt,
        end_at: ctx.input.createdAtEndAt
      };
    }
    if (ctx.input.groupIdsAll?.length) {
      filter.group_ids = { all: ctx.input.groupIdsAll };
    }
    if (ctx.input.creationSourceValues?.length) {
      filter.creation_source = {
        values: ctx.input.creationSourceValues,
        rule: 'INCLUDE'
      };
    }

    if (Object.keys(filter).length > 0) {
      query.filter = filter;
    }
    if (ctx.input.sortField || ctx.input.sortOrder) {
      query.sort = {
        ...(query.sort ?? {}),
        field: ctx.input.sortField,
        order: ctx.input.sortOrder
      };
    }

    let result = await client.searchCustomers({
      query: Object.keys(query).length > 0 ? query : undefined,
      count: ctx.input.count,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });
    let customers = result.customers.map(mapCustomer);

    return {
      output: { customers, cursor: result.cursor, count: result.count },
      message: `Found **${customers.length}** customer(s).${result.count !== undefined ? ` Total count: **${result.count}**.` : ''}${result.cursor ? ' More results available.' : ''}`
    };
  })
  .build();
