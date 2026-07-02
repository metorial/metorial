import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let queryRecords = SlateTool.create(spec, {
  name: 'Query Records',
  key: 'query_records',
  description: `Query and filter records from any ServiceNow table. Supports encoded queries, field selection, pagination, and sorting. Use this to search for incidents, changes, problems, users, or any other table records matching specific criteria.`,
  instructions: [
    'Use ServiceNow encoded query syntax for the query parameter, e.g. "priority=1^state=2" or "active=true^short_descriptionLIKEnetwork".',
    'Common tables: incident, change_request, problem, sc_request, sys_user, sys_user_group, cmdb_ci.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tableName: z
        .string()
        .describe(
          'Name of the ServiceNow table to query (e.g. "incident", "change_request", "sys_user")'
        ),
      query: z
        .string()
        .optional()
        .describe('Encoded query string to filter records (e.g. "priority=1^state!=7")'),
      fields: z
        .array(z.string())
        .optional()
        .describe('List of field names to return. If omitted, all fields are returned.'),
      limit: z
        .number()
        .optional()
        .default(20)
        .describe('Maximum number of records to return (default 20)'),
      offset: z.number().optional().describe('Number of records to skip for pagination'),
      orderBy: z.string().optional().describe('Field name to sort results by'),
      orderDirection: z
        .enum(['asc', 'desc'])
        .optional()
        .default('desc')
        .describe('Sort direction'),
      displayValue: z
        .enum(['true', 'false', 'all'])
        .optional()
        .describe('Return display values, actual values, or both')
    })
  )
  .output(
    z.object({
      records: z.array(z.record(z.string(), z.any())).describe('Array of matching records'),
      totalCount: z
        .number()
        .optional()
        .describe('Total number of matching records (if available)'),
      count: z.number().describe('Number of records returned in this response')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    let result = await client.getRecords(ctx.input.tableName, {
      query: ctx.input.query,
      fields: ctx.input.fields,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      orderBy: ctx.input.orderBy,
      orderDirection: ctx.input.orderDirection,
      displayValue: ctx.input.displayValue
    });

    return {
      output: {
        records: result.records,
        totalCount: result.totalCount,
        count: result.records.length
      },
      message: `Found **${result.records.length}** records in \`${ctx.input.tableName}\`${result.totalCount ? ` (${result.totalCount} total)` : ''}.`
    };
  })
  .build();
