import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRecord = SlateTool.create(spec, {
  name: 'Get Record',
  key: 'get_record',
  description: `Retrieve a single record by its row ID from a NocoDB table. Optionally specify which fields to include.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tableId: z.string().describe('The table ID (prefixed with m)'),
      recordId: z.string().describe('The row ID of the record to retrieve'),
      fields: z.string().optional().describe('Comma-separated field names to include')
    })
  )
  .output(
    z.object({
      record: z.record(z.string(), z.any()).describe('The record data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let record = await client.getRecord(ctx.input.tableId, ctx.input.recordId, {
      fields: ctx.input.fields
    });

    return {
      output: { record },
      message: `Retrieved record \`${ctx.input.recordId}\` from table \`${ctx.input.tableId}\`.`
    };
  })
  .build();
