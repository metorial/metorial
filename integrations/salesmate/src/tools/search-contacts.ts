import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let searchRuleSchema = z.object({
  fieldName: z
    .string()
    .describe('Field name to filter on (e.g., "email", "lastName", "company")'),
  condition: z
    .string()
    .describe('Filter condition (e.g., "EQUALS", "CONTAINS", "STARTS_WITH", "GREATER_THAN")'),
  value: z.string().describe('Value to match against')
});

export let searchContacts = SlateTool.create(spec, {
  name: 'Search Contacts',
  key: 'search_contacts',
  description: `Search and list contacts in Salesmate using filters. Supports pagination and sorting. Use filter rules to narrow results by any contact field.`,
  instructions: [
    'Common filter conditions: EQUALS, NOT_EQUALS, CONTAINS, NOT_CONTAINS, STARTS_WITH, ENDS_WITH, IS_EMPTY, IS_NOT_EMPTY, GREATER_THAN, LESS_THAN.',
    'Common fields to filter: firstName, lastName, email, company, owner, source, tags, createdAt, modifiedAt.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fields: z
        .array(z.string())
        .describe(
          'List of field names to return (e.g., ["firstName", "lastName", "email", "company"])'
        ),
      filters: z.array(searchRuleSchema).optional().describe('Filter rules to narrow results'),
      filterOperator: z
        .enum(['AND', 'OR'])
        .optional()
        .describe('Logical operator between filter rules. Defaults to AND.'),
      sortBy: z.string().optional().describe('Field name to sort by (e.g., "createdAt")'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      page: z.number().optional().describe('Page number (1-based). Defaults to 1.'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of records per page (max 100). Defaults to 25.')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of matching contact records'),
      totalCount: z.number().describe('Total number of matching contacts'),
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
                moduleName: 'Contact',
                field: { fieldName: f.fieldName },
                condition: f.condition,
                data: f.value
              }))
            }
          }
        : undefined;

    let result = await client.searchContacts({
      fields,
      query,
      sortBy,
      sortOrder,
      pageNo: page,
      rows: pageSize
    });

    let data = result?.Data ?? {};
    let contacts = data.data ?? [];
    let totalCount = data.totalCount ?? 0;
    let totalPages = data.totalPages ?? 0;

    return {
      output: { contacts, totalCount, totalPages },
      message: `Found **${totalCount}** contacts (page ${page ?? 1} of ${totalPages}).`
    };
  })
  .build();
