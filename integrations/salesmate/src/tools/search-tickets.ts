import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let searchRuleSchema = z.object({
  fieldName: z
    .string()
    .describe('Field name to filter on (e.g., "title", "status", "priority", "pipeline")'),
  condition: z.string().describe('Filter condition (e.g., "EQUALS", "CONTAINS")'),
  value: z.string().describe('Value to match against')
});

export let searchTickets = SlateTool.create(spec, {
  name: 'Search Tickets',
  key: 'search_tickets',
  description: `Search and list support tickets in Salesmate using filters. Supports pagination and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fields: z
        .array(z.string())
        .describe(
          'List of field names to return (e.g., ["title", "status", "priority", "stage"])'
        ),
      filters: z.array(searchRuleSchema).optional().describe('Filter rules to narrow results'),
      filterOperator: z
        .enum(['AND', 'OR'])
        .optional()
        .describe('Logical operator between filter rules. Defaults to AND.'),
      sortBy: z.string().optional().describe('Field name to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      page: z.number().optional().describe('Page number (1-based). Defaults to 1.'),
      pageSize: z.number().optional().describe('Records per page (max 100). Defaults to 25.')
    })
  )
  .output(
    z.object({
      tickets: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of matching ticket records'),
      totalCount: z.number().describe('Total number of matching tickets'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { fields, filters, filterOperator, sortBy, sortOrder, page, pageSize } = ctx.input;

    let query =
      filters && filters.length > 0
        ? {
            group: {
              operator: filterOperator ?? ('AND' as const),
              rules: filters.map(f => ({
                moduleName: 'Ticket',
                field: { fieldName: f.fieldName },
                condition: f.condition,
                data: f.value
              }))
            }
          }
        : undefined;

    let result = await client.searchTickets({
      fields,
      query,
      sortBy,
      sortOrder,
      pageNo: page,
      rows: pageSize
    });

    let data = result?.Data ?? {};
    let tickets = data.data ?? [];
    let totalCount = data.totalCount ?? 0;
    let totalPages = data.totalPages ?? 0;

    return {
      output: { tickets, totalCount, totalPages },
      message: `Found **${totalCount}** tickets (page ${page ?? 1} of ${totalPages}).`
    };
  })
  .build();
