import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateRecord = SlateTool.create(spec, {
  name: 'Update Record',
  key: 'update_record',
  description: `Update specific fields of an existing record in a Bubble data type. Only the provided fields will be modified; other fields remain unchanged. Use this for partial updates to existing records.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      dataType: z
        .string()
        .describe('Name of the Bubble data type (table) containing the record.'),
      recordId: z.string().describe('Unique ID of the record to update.'),
      fields: z
        .record(z.string(), z.any())
        .describe(
          'Key-value pairs of field names and their new values. Only specified fields will be updated.'
        )
    })
  )
  .output(
    z.object({
      updated: z.boolean().describe('Whether the update was successful.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.appBaseUrl,
      token: ctx.auth?.token
    });

    await client.updateRecord(ctx.input.dataType, ctx.input.recordId, ctx.input.fields);

    return {
      output: {
        updated: true
      },
      message: `Updated **${ctx.input.dataType}** record \`${ctx.input.recordId}\` with ${Object.keys(ctx.input.fields).length} field(s).`
    };
  })
  .build();
