import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteRecord = SlateTool.create(spec, {
  name: 'Delete Record',
  key: 'delete_record',
  description: `Permanently delete a record from a Bubble data type by its unique ID. This action is irreversible.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      dataType: z
        .string()
        .describe('Name of the Bubble data type (table) containing the record.'),
      recordId: z.string().describe('Unique ID of the record to delete.')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.appBaseUrl,
      token: ctx.auth?.token
    });

    await client.deleteRecord(ctx.input.dataType, ctx.input.recordId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted **${ctx.input.dataType}** record \`${ctx.input.recordId}\`.`
    };
  })
  .build();
