import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteRecord = SlateTool.create(spec, {
  name: 'Delete Record',
  key: 'delete_record',
  description: `Deletes one or more records from a Workiom list. Provide the list ID and one or more record IDs to remove.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list containing the records'),
      recordIds: z.array(z.string()).min(1).describe('Array of record IDs to delete')
    })
  )
  .output(
    z.object({
      deletedCount: z.number().describe('Number of records successfully deleted'),
      deletedRecordIds: z.array(z.string()).describe('IDs of the deleted records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let deleted: string[] = [];

    for (let recordId of ctx.input.recordIds) {
      try {
        await client.deleteRecord(ctx.input.listId, recordId);
        deleted.push(recordId);
      } catch (err: any) {
        ctx.warn(`Failed to delete record ${recordId}: ${err?.message ?? err}`);
      }
    }

    return {
      output: {
        deletedCount: deleted.length,
        deletedRecordIds: deleted
      },
      message: `Deleted **${deleted.length}** of **${ctx.input.recordIds.length}** record(s) from list **${ctx.input.listId}**.`
    };
  })
  .build();
