import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateRecords = SlateTool.create(spec, {
  name: 'Update Records',
  key: 'update_records',
  description: `Update one or more existing records in a NocoDB table. Each record must include its row \`Id\` along with the fields to update.
Supports bulk update by passing multiple records at once.`,
  instructions: [
    'Each record must include the "Id" field with the row ID to update.',
    'Only include fields that should be changed.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      tableId: z.string().describe('The table ID (prefixed with m)'),
      records: z
        .array(z.record(z.string(), z.any()))
        .min(1)
        .describe(
          'Array of record objects to update. Each must include "Id" and any fields to change.'
        )
    })
  )
  .output(
    z.object({
      updatedRecords: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of updated record objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let result = await client.updateRecords(ctx.input.tableId, ctx.input.records);
    let updatedRecords = Array.isArray(result) ? result : [result];

    return {
      output: { updatedRecords },
      message: `Updated **${updatedRecords.length}** record(s) in table \`${ctx.input.tableId}\`.`
    };
  })
  .build();
