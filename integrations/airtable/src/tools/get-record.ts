import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { baseIdInput } from './base-id';

export let getRecordTool = SlateTool.create(spec, {
  name: 'Get Record',
  key: 'get_record',
  description: `Retrieve a single record by its ID from a table in the specified Airtable base. Returns all field values for the specified record.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      baseId: baseIdInput,
      tableIdOrName: z.string().describe('Table ID (e.g. tblXXXXXX) or table name'),
      recordId: z.string().describe('Record ID (e.g. recXXXXXX)')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('Record ID'),
      createdTime: z.string().describe('Record creation timestamp'),
      fields: z.record(z.string(), z.any()).describe('Field values keyed by field name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseId: ctx.input.baseId
    });

    let record = await client.getRecord(ctx.input.tableIdOrName, ctx.input.recordId);

    return {
      output: {
        recordId: record.id,
        createdTime: record.createdTime,
        fields: record.fields
      },
      message: `Retrieved record **${record.id}** from table **${ctx.input.tableIdOrName}**.`
    };
  })
  .build();
