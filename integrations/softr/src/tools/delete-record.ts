import { SlateTool } from 'slates';
import { DatabaseClient } from '../lib/client';
import { dbId, exactRecord, nativeRecord, single, tblId } from '../lib/schemas';
import { connection, z } from '../lib/validation';
import { spec } from '../spec';
export const deleteRecord = SlateTool.create(spec, {
  name: 'Delete Record',
  key: 'delete_record',
  description:
    'Delete one exact record from a table discovered with list_tables. Requires a native 204 receipt, exact RESOURCE_NOT_FOUND readback and a still-accessible parent table. Deletion does not prove erasure of audit/history data and can have irreversible linked or automated effects.',
  tags: { destructive: true, readOnly: false }
})
  .input(z.object({ databaseId: dbId, tableId: tblId, recordId: z.string() }))
  .output(z.object({ recordId: z.string(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    const c = new DatabaseClient(connection(ctx.auth, ctx.config));
    exactRecord(
      single(
        nativeRecord,
        await c.getRecord(ctx.input.databaseId, ctx.input.tableId, ctx.input.recordId)
      ),
      ctx.input.tableId,
      ctx.input.recordId
    );
    await c.deleteRecord(ctx.input.databaseId, ctx.input.tableId, ctx.input.recordId);
    return {
      output: { recordId: ctx.input.recordId, deleted: true },
      message:
        'Native record absence confirmed after deletion. Retained history and downstream effects are not erased.'
    };
  })
  .build();
