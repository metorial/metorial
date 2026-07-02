import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { baseIdInput } from './base-id';

export let updateRecordsTool = SlateTool.create(spec, {
  name: 'Update Records',
  key: 'update_records',
  description: `Update one or more existing records in a table in the specified Airtable base. By default performs a partial update (PATCH) that only modifies specified fields. Set **replaceAllFields** to true to perform a full replacement (PUT) which clears unspecified fields.`,
  constraints: ['Maximum of 10 records per request.'],
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
            recordId: z.string().describe('Record ID to update (e.g. recXXXXXX)'),
            fields: z
              .record(z.string(), z.any())
              .describe('Field values to update, keyed by field name')
          })
        )
        .min(1)
        .max(10)
        .describe('Array of records to update (max 10)'),
      typecast: z
        .boolean()
        .optional()
        .describe('Automatically convert string values to appropriate field types'),
      replaceAllFields: z
        .boolean()
        .optional()
        .describe(
          'If true, performs a full record replacement (unspecified fields will be cleared). Defaults to false (partial update).'
        )
    })
  )
  .output(
    z.object({
      records: z.array(
        z.object({
          recordId: z.string().describe('Updated record ID'),
          createdTime: z.string().describe('Record creation timestamp'),
          fields: z
            .record(z.string(), z.any())
            .describe('Current field values of the updated record')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseId: ctx.input.baseId
    });

    let mappedRecords = ctx.input.records.map(r => ({
      id: r.recordId,
      fields: r.fields
    }));

    let result = await client.updateRecords(ctx.input.tableIdOrName, mappedRecords, {
      typecast: ctx.input.typecast,
      method: ctx.input.replaceAllFields ? 'PUT' : 'PATCH'
    });

    return {
      output: {
        records: result.records.map(r => ({
          recordId: r.id,
          createdTime: r.createdTime,
          fields: r.fields
        }))
      },
      message: `Updated ${result.records.length} record(s) in table **${ctx.input.tableIdOrName}**.`
    };
  })
  .build();
