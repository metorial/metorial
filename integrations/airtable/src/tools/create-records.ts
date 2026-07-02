import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { baseIdInput } from './base-id';

export let createRecordsTool = SlateTool.create(spec, {
  name: 'Create Records',
  key: 'create_records',
  description: `Create one or more records in a table in the specified Airtable base. Provide field values for each record. Enable typecast to automatically convert string values to the appropriate field types.`,
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
            fields: z.record(z.string(), z.any()).describe('Field values keyed by field name')
          })
        )
        .min(1)
        .max(10)
        .describe('Array of records to create (max 10)'),
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
          recordId: z.string().describe('Created record ID'),
          createdTime: z.string().describe('Record creation timestamp'),
          fields: z.record(z.string(), z.any()).describe('Field values of the created record')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseId: ctx.input.baseId
    });

    let result = await client.createRecords(ctx.input.tableIdOrName, ctx.input.records, {
      typecast: ctx.input.typecast
    });

    return {
      output: {
        records: result.records.map(r => ({
          recordId: r.id,
          createdTime: r.createdTime,
          fields: r.fields
        }))
      },
      message: `Created ${result.records.length} record(s) in table **${ctx.input.tableIdOrName}**.`
    };
  })
  .build();
