import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let queryRecords = SlateTool.create(spec, {
  name: 'Query Records',
  key: 'query_records',
  description: `Search and filter records across any Fireberry object type using the query language.
Supports complex filtering with operators (=, !=, >, <, >=, <=, start-with, not-start-with, is-null, is-not-null), logical operators (AND, OR), field selection, sorting, and pagination.`,
  instructions: [
    'Each filter statement must be enclosed in parentheses: (fieldname operator value)',
    "Use single quotes for string values with whitespace: (accountname start-with 'Bob D')",
    'Use % prefix with start-with for substring/contains matching: (accountname start-with %search)',
    'Combine statements with AND or OR: (field1 = value1) AND (field2 > 10)',
    'The objectType can be a number (e.g., 1 for accounts) or system name.'
  ],
  constraints: ['Maximum page size is 50.', 'Maximum page number is 10.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objectType: z
        .union([z.string(), z.number()])
        .describe(
          'Object type number or system name (e.g., 1 for accounts, "account", "contact")'
        ),
      query: z
        .string()
        .optional()
        .describe(
          'Filter expression (e.g., "(accountname start-with \'Acme\') AND (statuscode = 1)")'
        ),
      fields: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of field names to return (e.g., "accountname,emailaddress1,telephone1"). Omit to return all fields.'
        ),
      sortBy: z.string().optional().describe('Field name to sort results by'),
      sortType: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      pageSize: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Number of records per page (max 50)'),
      pageNumber: z.number().min(1).max(10).optional().describe('Page number (max 10)')
    })
  )
  .output(
    z.object({
      primaryKey: z.string().describe('The primary key field name'),
      primaryField: z.string().describe('The primary display field name'),
      totalRecords: z.number().describe('Total matching records'),
      pageSize: z.number().describe('Records per page'),
      pageNumber: z.number().describe('Current page'),
      records: z.array(z.record(z.string(), z.any())).describe('Matching records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.query({
      objecttype: ctx.input.objectType,
      query: ctx.input.query,
      fields: ctx.input.fields,
      sort_by: ctx.input.sortBy,
      sort_type: ctx.input.sortType,
      page_size: ctx.input.pageSize,
      page_number: ctx.input.pageNumber
    });

    return {
      output: {
        primaryKey: result.PrimaryKey,
        primaryField: result.PrimaryField,
        totalRecords: result.Total_Records,
        pageSize: result.Page_Size,
        pageNumber: result.Page_Number,
        records: result.Records
      },
      message: `Found **${result.Total_Records}** matching **${ctx.input.objectType}** records. Showing **${result.Records.length}** on page ${result.Page_Number}.`
    };
  })
  .build();
