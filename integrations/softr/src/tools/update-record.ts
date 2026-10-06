import { SlateTool } from 'slates';
import { DatabaseClient } from '../lib/client';
import {
  dbId,
  exactRecord,
  mappedRecord,
  nativeRecord,
  recordOutput,
  single,
  tblId
} from '../lib/schemas';
import { bytes, connection, fail, z } from '../lib/validation';
import { spec } from '../spec';
export const updateRecord = SlateTool.create(spec, {
  name: 'Update Record',
  key: 'update_record',
  description:
    'Partially update an exact record using native PATCH. Only supplied fields are changed. Discover field IDs/types with list_tables; computed/system fields cannot be written. Reconcile uncertain writes before retrying.',
  tags: { readOnly: false }
})
  .input(
    z.object({
      databaseId: dbId,
      tableId: tblId,
      recordId: z.string(),
      fields: z.record(z.string(), z.unknown()),
      fieldNames: z.boolean().optional()
    })
  )
  .output(recordOutput)
  .handleInvocation(async ctx => {
    if (!Object.keys(ctx.input.fields).length)
      fail('Provide at least one field value to update.');
    bytes(ctx.input.fields);
    const c = new DatabaseClient(connection(ctx.auth, ctx.config));
    exactRecord(
      single(
        nativeRecord,
        await c.getRecord(ctx.input.databaseId, ctx.input.tableId, ctx.input.recordId)
      ),
      ctx.input.tableId,
      ctx.input.recordId
    );
    const v = exactRecord(
      single(
        nativeRecord,
        await c.updateRecord(
          ctx.input.databaseId,
          ctx.input.tableId,
          ctx.input.recordId,
          ctx.input.fields,
          { fieldNames: ctx.input.fieldNames }
        )
      ),
      ctx.input.tableId,
      ctx.input.recordId
    );
    return {
      output: mappedRecord(v),
      message: 'Softr returned the exact record after partial update.'
    };
  })
  .build();
