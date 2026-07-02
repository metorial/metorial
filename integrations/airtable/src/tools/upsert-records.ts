import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { baseIdInput } from './base-id';

export let upsertRecordsTool = SlateTool.create(spec, {
  name: 'Upsert Records',
  key: 'upsert_records',
  description: `Find, create, or update records in a single operation. Records are matched using the specified merge fields. If a matching record is found it will be updated; otherwise a new record is created. This is useful for syncing data from external sources.`,
  instructions: [
    'fieldsToMergeOn specifies which fields to use when matching existing records. At least one field is required and at most three.',
    'The merge fields must have unique values for each record. If multiple records match, the first match is updated.'
  ],
  constraints: ['Maximum of 10 records per request.', 'At most 3 merge fields allowed.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      baseId: baseIdInput,
      tableIdOrName: z.string().describe('Table ID (e.g. tblXXXXXX) or table name'),
      records: z
        .array(
          z.object({
            fields: z.record(z.string(), z.any()).describe('Field values keyed by field name')
          })
        )
        .min(1)
        .max(10)
        .describe('Array of records to upsert (max 10)'),
      fieldsToMergeOn: z
        .array(z.string())
        .min(1)
        .max(3)
        .describe('Field names to match existing records on (1-3 fields)'),
      typecast: z
        .boolean()
        .optional()
        .describe('Automatically convert string values to appropriate field types')
    })
  )
  .output(
    z.object({
      records: z.array(
        z.object({
          recordId: z.string().describe('Record ID'),
          createdTime: z.string().describe('Record creation timestamp'),
          fields: z.record(z.string(), z.any()).describe('Current field values of the record')
        })
      ),
      createdRecordIds: z.array(z.string()).describe('IDs of newly created records'),
      updatedRecordIds: z.array(z.string()).describe('IDs of updated records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseId: ctx.input.baseId
    });

    let result = await client.upsertRecords(
      ctx.input.tableIdOrName,
      ctx.input.records,
      ctx.input.fieldsToMergeOn,
      { typecast: ctx.input.typecast }
    );

    return {
      output: {
        records: result.records.map(r => ({
          recordId: r.id,
          createdTime: r.createdTime,
          fields: r.fields
        })),
        createdRecordIds: result.createdRecords,
        updatedRecordIds: result.updatedRecords
      },
      message: `Upserted ${result.records.length} record(s) in table **${ctx.input.tableIdOrName}** (${result.createdRecords.length} created, ${result.updatedRecords.length} updated).`
    };
  })
  .build();
