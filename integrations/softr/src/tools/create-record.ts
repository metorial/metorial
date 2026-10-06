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
export const createRecord = SlateTool.create(spec, {
  name: 'Create Record',
  key: 'create_record',
  description:
    'Create one record in a table discovered with list_tables. Use native field IDs and value types; computed/system fields cannot be written. fieldNames retains the provider alias option, but IDs avoid ambiguous names. A retry after an uncertain receipt may create a duplicate.',
  tags: { readOnly: false }
})
  .input(
    z.object({
      databaseId: dbId,
      tableId: tblId,
      fields: z.record(z.string(), z.unknown()),
      fieldNames: z.boolean().optional()
    })
  )
  .output(recordOutput)
  .handleInvocation(async ctx => {
    if (!Object.keys(ctx.input.fields).length) fail('Provide at least one field value.');
    bytes(ctx.input.fields);
    const c = new DatabaseClient(connection(ctx.auth, ctx.config));
    const v = exactRecord(
      single(
        nativeRecord,
        await c.createRecord(ctx.input.databaseId, ctx.input.tableId, ctx.input.fields, {
          fieldNames: ctx.input.fieldNames
        })
      ),
      ctx.input.tableId
    );
    return {
      output: mappedRecord(v),
      message: 'Softr returned the created record and its exact ID.'
    };
  })
  .build();
