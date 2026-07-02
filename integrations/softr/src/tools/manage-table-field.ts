import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabaseClient } from '../lib/client';
import { spec } from '../spec';

let fieldOutputSchema = z.object({
  fieldId: z.string().describe('Unique field identifier'),
  name: z.string().describe('Field name'),
  type: z.string().describe('Field type'),
  description: z.string().nullable().describe('Field description'),
  allowMultipleEntries: z
    .boolean()
    .optional()
    .describe('Whether multiple entries are allowed'),
  readonly: z.boolean().optional().describe('Whether the field is read-only'),
  required: z.boolean().optional().describe('Whether the field is required'),
  locked: z.boolean().optional().describe('Whether the field is locked'),
  defaultValue: z.string().nullable().optional().describe('Default value for the field'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let manageTableField = SlateTool.create(spec, {
  name: 'Manage Table Field',
  key: 'manage_table_field',
  description: `Add, retrieve, update, or delete a field (column) on a Softr table. Use this to manage the schema of your tables.
- To **add**: provide \`name\` and \`type\`. Supported types include: SINGLE_LINE_TEXT, CHECKBOX, CURRENCY, DATE, DATETIME, DURATION, EMAIL, SELECT, NUMBER, ATTACHMENT, RATING, LINKED_RECORD, LONG_TEXT, URL, PERCENT, PHONE.
- To **get**: provide \`fieldId\` only.
- To **update**: provide \`fieldId\` with new \`name\`, \`type\`, or \`options\`.
- To **delete**: provide \`fieldId\` and set \`delete\` to true.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      databaseId: z.string().describe('ID of the database'),
      tableId: z.string().describe('ID of the table'),
      fieldId: z
        .string()
        .optional()
        .describe('ID of the field (required for get/update/delete)'),
      name: z.string().optional().describe('Field name (required for add)'),
      type: z.string().optional().describe('Field type (required for add)'),
      options: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Type-specific configuration options'),
      description: z.string().optional().describe('Field description (for add)'),
      allowMultipleEntries: z
        .boolean()
        .optional()
        .describe('Whether to allow multiple entries (for add)'),
      required: z.boolean().optional().describe('Whether the field is required (for add)'),
      defaultValue: z.string().optional().describe('Default value (for add)'),
      delete: z.boolean().optional().describe('Set to true to delete the field')
    })
  )
  .output(
    z.object({
      field: fieldOutputSchema.optional().describe('Field details (not returned on delete)'),
      deleted: z.boolean().optional().describe('True if field was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabaseClient({ token: ctx.auth.token });
    let {
      databaseId,
      tableId,
      fieldId,
      name,
      type,
      options,
      description,
      allowMultipleEntries,
      required: isRequired,
      defaultValue
    } = ctx.input;

    let mapField = (f: any) => ({
      fieldId: f.id,
      name: f.name,
      type: f.type,
      description: f.description ?? null,
      allowMultipleEntries: f.allowMultipleEntries,
      readonly: f.readonly,
      required: f.required,
      locked: f.locked,
      defaultValue: f.defaultValue ?? null,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt
    });

    if (ctx.input.delete) {
      if (!fieldId) throw new Error('fieldId is required to delete a field.');
      await client.deleteTableField(databaseId, tableId, fieldId);
      return {
        output: { deleted: true },
        message: `Field \`${fieldId}\` deleted from table \`${tableId}\`.`
      };
    }

    if (!fieldId && name && type) {
      let result = await client.addTableField(databaseId, tableId, {
        name,
        type,
        options,
        description,
        allowMultipleEntries,
        required: isRequired,
        defaultValue
      });
      let field = mapField(result.data);
      return {
        output: { field },
        message: `Field **${field.name}** (${field.type}) added to table.`
      };
    }

    if (fieldId && (name || type || options)) {
      let updateParams: { name?: string; type?: string; options?: Record<string, unknown> } =
        {};
      if (name) updateParams.name = name;
      if (type) updateParams.type = type;
      if (options) updateParams.options = options;
      let result = await client.updateTableField(databaseId, tableId, fieldId, updateParams);
      let field = mapField(result.data);
      return {
        output: { field },
        message: `Field **${field.name}** updated.`
      };
    }

    if (fieldId) {
      let result = await client.getTableField(databaseId, tableId, fieldId);
      let field = mapField(result.data);
      return {
        output: { field },
        message: `Retrieved field **${field.name}** (${field.type}).`
      };
    }

    throw new Error(
      'Invalid input: provide fieldId (to get/update/delete) or name + type (to add).'
    );
  })
  .build();
