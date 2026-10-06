import { pickDefined, SlateTool } from 'slates';
import { DatabaseClient } from '../lib/client';
import {
  dbId,
  exact,
  mappedTable,
  nativeTable,
  page,
  single,
  tableOutput,
  tblId
} from '../lib/schemas';
import { connection, fail, text, z } from '../lib/validation';
import { spec } from '../spec';

const fieldInput = z.object({
  name: z.string(),
  type: z.string(),
  options: z.record(z.string(), z.unknown()).optional()
});
export const manageTable = SlateTool.create(spec, {
  name: 'Manage Table',
  key: 'manage_table',
  description:
    'Create, get, update or delete a table in a database from list_databases. Discover existing tables with list_tables. fields and primaryFieldName apply only to creation. Delete requires an empty table unless force:true explicitly authorizes record removal. Native absence is checked; retained history is not erased.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      databaseId: dbId,
      tableId: tblId.optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      primaryFieldName: z.string().optional(),
      fields: z.array(fieldInput).optional(),
      delete: z.boolean().optional(),
      force: z.boolean().optional()
    })
  )
  .output(z.object({ table: tableOutput.optional(), deleted: z.boolean().optional() }))
  .handleInvocation(async ctx => {
    const i = ctx.input;
    const c = new DatabaseClient(connection(ctx.auth, ctx.config));
    if (i.force !== undefined && !i.delete) fail('force applies only to delete:true.');
    if (
      i.tableId !== undefined &&
      (i.fields !== undefined || i.primaryFieldName !== undefined)
    )
      fail(
        'fields and primaryFieldName are create-only; use manage_table_field for an existing table.'
      );
    if (i.delete) {
      if (!i.tableId || i.name !== undefined || i.description !== undefined)
        fail('Delete requires databaseId, tableId and delete:true, with optional force.');
      exact(single(nativeTable, await c.getTable(i.databaseId, i.tableId)), i.tableId);
      if (
        !i.force &&
        page(
          await c.listRecords(i.databaseId, i.tableId, { offset: 0, limit: 1 }),
          i.tableId,
          { offset: 0, limit: 1 }
        ).total !== 0
      )
        fail(
          'The table contains records. Remove them first or explicitly authorize force:true.'
        );
      await c.deleteTable(i.databaseId, i.tableId, i.force);
      return {
        output: { deleted: true },
        message: 'Native table absence confirmed. Retained history is not erased.'
      };
    }
    if (i.name !== undefined) text(i.name, 'table name');
    if (i.primaryFieldName !== undefined) text(i.primaryFieldName, 'primary field name');
    if (i.fields !== undefined) {
      if (i.fields.length > 100) fail('Use at most 100 initial fields.');
      for (const f of i.fields) {
        text(f.name, 'field name');
        text(f.type, 'field type');
      }
      if (new Set(i.fields.map(f => f.name)).size !== i.fields.length)
        fail('Initial field names must be distinct.');
    }
    if (i.tableId === undefined) {
      if (i.name === undefined)
        fail('Create requires name; read/update/delete requires tableId.');
      const v = single(
        nativeTable,
        await c.createTable(
          i.databaseId,
          pickDefined({
            name: i.name,
            description: i.description,
            primaryFieldName: i.primaryFieldName,
            fields: i.fields
          })
        )
      );
      if (v.name !== i.name)
        fail(
          'The table creation receipt has a different name. Reconcile the returned ID before retrying.',
          'mutation_unverified'
        );
      return {
        output: { table: mappedTable(v) },
        message: 'Softr returned the created table and its exact ID.'
      };
    }
    const before = exact(
      single(nativeTable, await c.getTable(i.databaseId, i.tableId)),
      i.tableId
    );
    if (i.name === undefined && i.description === undefined)
      return {
        output: { table: mappedTable(before) },
        message: 'Returned the exact table and its fields.'
      };
    const v = exact(
      single(
        nativeTable,
        await c.updateTable(
          i.databaseId,
          i.tableId,
          pickDefined({ name: i.name, description: i.description })
        )
      ),
      i.tableId
    );
    if (
      (i.name !== undefined && v.name !== i.name) ||
      (i.description !== undefined && v.description !== i.description)
    )
      fail(
        'The table update receipt differs from the requested state. Read the table before retrying.',
        'mutation_unverified'
      );
    return {
      output: { table: mappedTable(v) },
      message: 'Softr returned the exact updated table.'
    };
  })
  .build();
