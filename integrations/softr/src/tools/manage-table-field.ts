import { pickDefined, SlateTool } from 'slates';
import { DatabaseClient } from '../lib/client';
import {
  dbId,
  exact,
  fieldOutput,
  mappedField,
  nativeField,
  single,
  tblId
} from '../lib/schemas';
import { connection, fail, text, z } from '../lib/validation';
import { spec } from '../spec';
export const manageTableField = SlateTool.create(spec, {
  name: 'Manage Table Field',
  key: 'manage_table_field',
  description:
    'Add, read, update or delete an exact table field. Use list_tables to discover field IDs and native types. The documented write contract supports name, type and options. Retained description, allowMultipleEntries, required and defaultValue inputs are refused when supplied because the current write schema does not document them. Deleting a field removes its stored values; type/options changes can affect existing data.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      databaseId: dbId,
      tableId: tblId,
      fieldId: z.string().optional(),
      name: z.string().optional(),
      type: z.string().optional(),
      options: z.record(z.string(), z.unknown()).optional(),
      description: z.string().optional(),
      allowMultipleEntries: z.boolean().optional(),
      required: z.boolean().optional(),
      defaultValue: z.string().optional(),
      delete: z.boolean().optional()
    })
  )
  .output(z.object({ field: fieldOutput.optional(), deleted: z.boolean().optional() }))
  .handleInvocation(async ctx => {
    const i = ctx.input;
    const c = new DatabaseClient(connection(ctx.auth, ctx.config));
    if (
      [i.description, i.allowMultipleEntries, i.required, i.defaultValue].some(
        v => v !== undefined
      )
    )
      fail(
        'Current field writes document only name, type and options. Omit the retained unsupported fields and configure them in Softr instead.',
        'unsupported_field_parameters'
      );
    if (i.delete) {
      if (!i.fieldId || [i.name, i.type, i.options].some(v => v !== undefined))
        fail('Delete accepts only databaseId, tableId, fieldId and delete:true.');
      exact(
        single(nativeField, await c.getTableField(i.databaseId, i.tableId, i.fieldId)),
        i.fieldId
      );
      await c.deleteTableField(i.databaseId, i.tableId, i.fieldId);
      return {
        output: { deleted: true },
        message:
          'Native field absence confirmed after deletion; stored field values and retained history have separate consequences.'
      };
    }
    if (i.name !== undefined) text(i.name, 'field name');
    if (i.type !== undefined) text(i.type, 'native field type');
    if (i.fieldId === undefined) {
      if (i.name === undefined || i.type === undefined)
        fail('Adding a field requires name and type; otherwise provide fieldId.');
      const v = single(
        nativeField,
        await c.addTableField(
          i.databaseId,
          i.tableId,
          pickDefined({ name: i.name, type: i.type, options: i.options })
        )
      );
      if (v.name !== i.name || v.type !== i.type)
        fail(
          'The field creation receipt differs from the requested name/type. Read its returned ID before retrying.',
          'mutation_unverified'
        );
      return {
        output: { field: mappedField(v) },
        message: 'Softr returned the created field and its exact ID.'
      };
    }
    const before = exact(
      single(nativeField, await c.getTableField(i.databaseId, i.tableId, i.fieldId)),
      i.fieldId
    );
    if ([i.name, i.type, i.options].every(v => v === undefined))
      return {
        output: { field: mappedField(before) },
        message: 'Returned the exact native field.'
      };
    const v = exact(
      single(
        nativeField,
        await c.updateTableField(
          i.databaseId,
          i.tableId,
          i.fieldId,
          pickDefined({ name: i.name, type: i.type, options: i.options })
        )
      ),
      i.fieldId
    );
    if (
      (i.name !== undefined && v.name !== i.name) ||
      (i.type !== undefined && v.type !== i.type)
    )
      fail(
        'The field update receipt differs from requested state. Read the field before retrying.',
        'mutation_unverified'
      );
    return {
      output: { field: mappedField(v) },
      message:
        'Softr returned the exact updated field; provider normalization may apply to its options.'
    };
  })
  .build();
