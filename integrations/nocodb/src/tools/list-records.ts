import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listRecords = SlateTool.create(spec, {
  name: 'List Records',
  key: 'list_records',
  description: `Query and list records from a NocoDB table with optional filtering, sorting, field selection, and pagination.
Use the \`where\` parameter for filtering with syntax like \`(fieldName,eq,value)\`. Logical operators: \`~and\`, \`~or\`. Comparison operators: \`eq\`, \`neq\`, \`gt\`, \`lt\`, \`gte\`, \`lte\`, \`like\`, \`nlike\`, \`is\`, \`isnot\`, \`in\`, \`btw\`, \`nbtw\`.
Use the \`sort\` parameter to order results; prefix with \`-\` for descending.`,
  instructions: [
    'Where clause example: (Status,eq,Active)~and(Age,gt,25)',
    'Sort example: -CreatedAt for descending by CreatedAt',
    'Fields example: Name,Email,Status to only return those columns'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tableId: z.string().describe('The table ID (prefixed with m, e.g. m1abc2def)'),
      where: z
        .string()
        .optional()
        .describe('Filter condition, e.g. (Status,eq,Active)~and(Age,gt,25)'),
      sort: z
        .string()
        .optional()
        .describe('Sort by field name. Prefix with - for descending, e.g. -CreatedAt'),
      fields: z
        .string()
        .optional()
        .describe('Comma-separated field names to include in the response'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of records to return (default 25, max 1000)'),
      offset: z.number().optional().describe('Number of records to skip for pagination'),
      viewId: z.string().optional().describe('View ID to scope the query to a specific view')
    })
  )
  .output(
    z.object({
      records: z.array(z.record(z.string(), z.any())).describe('Array of record objects'),
      pageInfo: z
        .object({
          totalRows: z.number().optional().describe('Total number of matching records'),
          page: z.number().optional().describe('Current page number'),
          pageSize: z.number().optional().describe('Number of records per page'),
          isFirstPage: z.boolean().optional(),
          isLastPage: z.boolean().optional()
        })
        .optional()
        .describe('Pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let result = await client.listRecords(ctx.input.tableId, {
      where: ctx.input.where,
      sort: ctx.input.sort,
      fields: ctx.input.fields,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      viewId: ctx.input.viewId
    });

    let records = result?.list ?? [];
    let pageInfo = result?.pageInfo;

    return {
      output: { records, pageInfo },
      message: `Retrieved **${records.length}** record(s) from table \`${ctx.input.tableId}\`.${pageInfo?.totalRows != null ? ` Total: ${pageInfo.totalRows}.` : ''}`
    };
  })
  .build();
