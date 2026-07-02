import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabaseClient } from '../lib/client';
import { spec } from '../spec';

export let updateRecord = SlateTool.create(spec, {
  name: 'Update Record',
  key: 'update_record',
  description: `Partially update a record in a Softr table. Only the fields provided will be updated; other fields remain unchanged.`,
  instructions: [
    'Set `fieldNames` to true to use human-readable field names as keys instead of field IDs.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      databaseId: z.string().describe('ID of the database'),
      tableId: z.string().describe('ID of the table'),
      recordId: z.string().describe('ID of the record to update'),
      fields: z
        .record(z.string(), z.unknown())
        .describe('Map of field IDs (or names) to new values'),
      fieldNames: z.boolean().optional().describe('Use field names instead of IDs as keys')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('ID of the updated record'),
      tableId: z.string().describe('Table the record belongs to'),
      fields: z.record(z.string(), z.unknown()).describe('Updated field values'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabaseClient({ token: ctx.auth.token });

    let result = await client.updateRecord(
      ctx.input.databaseId,
      ctx.input.tableId,
      ctx.input.recordId,
      ctx.input.fields,
      { fieldNames: ctx.input.fieldNames }
    );

    let record = result.data;

    return {
      output: {
        recordId: record.id,
        tableId: record.tableId,
        fields: record.fields || {},
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      },
      message: `Record \`${record.id}\` updated successfully.`
    };
  })
  .build();
