import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteRecord = SlateTool.create(spec, {
  name: 'Delete Record',
  key: 'delete_record',
  description: `Permanently delete a record from any Fireberry object type. This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      objectType: z
        .string()
        .describe(
          'The object type system name (e.g., "account", "contact", "opportunity", "cases", "task")'
        ),
      recordId: z.string().describe('The GUID of the record to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the record was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.deleteRecord(ctx.input.objectType, ctx.input.recordId);

    return {
      output: { deleted: true },
      message: `Deleted **${ctx.input.objectType}** record \`${ctx.input.recordId}\`.`
    };
  })
  .build();
