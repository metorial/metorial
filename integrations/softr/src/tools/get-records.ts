import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabaseClient } from '../lib/client';
import { spec } from '../spec';

let recordSchema = z.object({
  recordId: z.string().describe('Unique record identifier'),
  tableId: z.string().describe('Table the record belongs to'),
  fields: z
    .record(z.string(), z.unknown())
    .describe('Field values of the record (keyed by field ID or name)'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let getRecords = SlateTool.create(spec, {
  name: 'Get Records',
  key: 'get_records',
  description: `Retrieve records from a Softr table. Fetch a single record by ID, or list records with pagination. Use the \`fieldNames\` option to get human-readable field names instead of field IDs in the response.`,
  instructions: [
    'Set `fieldNames` to true for more readable output with field names as keys instead of IDs.',
    'Use `offset` and `limit` for pagination. Maximum `limit` is 200.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      databaseId: z.string().describe('ID of the database'),
      tableId: z.string().describe('ID of the table'),
      recordId: z
        .string()
        .optional()
        .describe('Specific record ID to retrieve. If omitted, lists records.'),
      offset: z
        .number()
        .optional()
        .describe('Number of records to skip (for pagination, default 0)'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of records to return (default 10, max 200)'),
      fieldNames: z
        .boolean()
        .optional()
        .describe('Use field names instead of IDs as keys in the response'),
      viewId: z.string().optional().describe('Filter records by a specific view')
    })
  )
  .output(
    z.object({
      records: z.array(recordSchema).optional().describe('List of records (when listing)'),
      record: recordSchema.optional().describe('Single record (when fetching by ID)'),
      total: z.number().optional().describe('Total number of records in the table'),
      offset: z.number().optional().describe('Current offset'),
      limit: z.number().optional().describe('Current limit')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabaseClient({ token: ctx.auth.token });
    let { databaseId, tableId, recordId, offset, limit, fieldNames, viewId } = ctx.input;

    let mapRecord = (r: any) => ({
      recordId: r.id,
      tableId: r.tableId,
      fields: r.fields || {},
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    });

    if (recordId) {
      let result = await client.getRecord(databaseId, tableId, recordId, { fieldNames });
      let record = mapRecord(result.data);
      return {
        output: { record },
        message: `Retrieved record \`${recordId}\`.`
      };
    }

    let result = await client.listRecords(databaseId, tableId, {
      offset,
      limit,
      fieldNames,
      viewId
    });
    let records = (result.data || []).map(mapRecord);
    let metadata = result.metadata || {};

    return {
      output: {
        records,
        total: metadata.total,
        offset: metadata.offset,
        limit: metadata.limit
      },
      message: `Retrieved **${records.length}** record(s)${metadata.total !== undefined ? ` out of ${metadata.total} total` : ''}.`
    };
  })
  .build();
