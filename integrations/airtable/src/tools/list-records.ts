import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { baseIdInput } from './base-id';

export let listRecordsTool = SlateTool.create(spec, {
  name: 'List Records',
  key: 'list_records',
  description: `List records from a table in the specified Airtable base. Supports filtering with Airtable formulas, sorting by fields, scoping to a specific view, selecting specific fields, and pagination.`,
  instructions: [
    'Use filterByFormula with Airtable formula syntax, e.g. `{Status} = "Active"` or `AND({Priority} = "High", {Assignee} != "")`.',
    'Use the offset from the response to paginate through results. If offset is present, there are more records to fetch.'
  ],
  constraints: [
    'Maximum of 100 records per page (pageSize).',
    'Rate limited to 5 requests per second per base.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      baseId: baseIdInput,
      tableIdOrName: z.string().describe('Table ID (e.g. tblXXXXXX) or table name'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Only return specific field names or IDs'),
      filterByFormula: z
        .string()
        .optional()
        .describe('Airtable formula to filter records (e.g. `{Status} = "Done"`)'),
      maxRecords: z.number().optional().describe('Maximum total number of records to return'),
      pageSize: z.number().optional().describe('Number of records per page (max 100)'),
      sort: z
        .array(
          z.object({
            field: z.string().describe('Field name or ID to sort by'),
            direction: z
              .enum(['asc', 'desc'])
              .optional()
              .describe('Sort direction (default: asc)')
          })
        )
        .optional()
        .describe('Sort configuration'),
      view: z.string().optional().describe('View name or ID to scope records to'),
      offset: z.string().optional().describe('Pagination offset from a previous response')
    })
  )
  .output(
    z.object({
      records: z.array(
        z.object({
          recordId: z.string().describe('Record ID'),
          createdTime: z.string().describe('Record creation timestamp'),
          fields: z.record(z.string(), z.any()).describe('Field values keyed by field name')
        })
      ),
      offset: z
        .string()
        .optional()
        .describe('Pagination offset for the next page, if more records exist')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseId: ctx.input.baseId
    });

    let result = await client.listRecords(ctx.input.tableIdOrName, {
      fields: ctx.input.fields,
      filterByFormula: ctx.input.filterByFormula,
      maxRecords: ctx.input.maxRecords,
      pageSize: ctx.input.pageSize,
      sort: ctx.input.sort,
      view: ctx.input.view,
      offset: ctx.input.offset
    });

    return {
      output: {
        records: result.records.map(r => ({
          recordId: r.id,
          createdTime: r.createdTime,
          fields: r.fields
        })),
        offset: result.offset
      },
      message: `Retrieved ${result.records.length} record(s) from table **${ctx.input.tableIdOrName}**.${result.offset ? ' More records available (use offset to paginate).' : ''}`
    };
  })
  .build();
