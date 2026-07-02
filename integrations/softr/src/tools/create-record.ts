import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabaseClient } from '../lib/client';
import { spec } from '../spec';

export let createRecord = SlateTool.create(spec, {
  name: 'Create Record',
  key: 'create_record',
  description: `Create a new record in a Softr table. Provide field values as a map of field IDs (or field names if \`fieldNames\` is true) to their values.`,
  instructions: [
    'Use the **List Tables** tool first to discover field IDs and types for the target table.',
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
      fields: z
        .record(z.string(), z.unknown())
        .describe('Map of field IDs (or names) to values for the new record'),
      fieldNames: z.boolean().optional().describe('Use field names instead of IDs as keys')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('ID of the created record'),
      tableId: z.string().describe('Table the record was created in'),
      fields: z.record(z.string(), z.unknown()).describe('Field values of the created record'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabaseClient({ token: ctx.auth.token });

    let result = await client.createRecord(
      ctx.input.databaseId,
      ctx.input.tableId,
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
      message: `Record \`${record.id}\` created successfully.`
    };
  })
  .build();
