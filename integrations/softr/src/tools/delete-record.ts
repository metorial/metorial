import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabaseClient } from '../lib/client';
import { spec } from '../spec';

export let deleteRecord = SlateTool.create(spec, {
  name: 'Delete Record',
  key: 'delete_record',
  description: `Delete a record from a Softr table by its ID. This action is permanent and cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      databaseId: z.string().describe('ID of the database'),
      tableId: z.string().describe('ID of the table'),
      recordId: z.string().describe('ID of the record to delete')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('ID of the deleted record'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabaseClient({ token: ctx.auth.token });

    await client.deleteRecord(ctx.input.databaseId, ctx.input.tableId, ctx.input.recordId);

    return {
      output: {
        recordId: ctx.input.recordId,
        deleted: true
      },
      message: `Record \`${ctx.input.recordId}\` deleted successfully.`
    };
  })
  .build();
