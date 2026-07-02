import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabaseClient } from '../lib/client';
import { spec } from '../spec';

let fieldInputSchema = z.object({
  name: z.string().describe('Field name'),
  type: z
    .string()
    .describe(
      'Field type (e.g., SINGLE_LINE_TEXT, CHECKBOX, CURRENCY, DATE, DATETIME, DURATION, EMAIL, SELECT, NUMBER, ATTACHMENT, RATING, LINKED_RECORD, LONG_TEXT, URL, PERCENT, PHONE)'
    ),
  options: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Type-specific configuration options')
});

let fieldOutputSchema = z.object({
  fieldId: z.string().describe('Unique field identifier'),
  name: z.string().describe('Field name'),
  type: z.string().describe('Field type'),
  description: z.string().nullable().optional().describe('Field description'),
  required: z.boolean().optional().describe('Whether the field is required'),
  readonly: z.boolean().optional().describe('Whether the field is read-only')
});

let tableOutputSchema = z.object({
  tableId: z.string().describe('Unique table identifier'),
  name: z.string().describe('Table name'),
  description: z.string().nullable().describe('Table description'),
  primaryFieldId: z.string().describe('ID of the primary field'),
  defaultViewId: z.string().describe('ID of the default view'),
  fields: z.array(fieldOutputSchema).describe('Table fields'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let manageTable = SlateTool.create(spec, {
  name: 'Manage Table',
  key: 'manage_table',
  description: `Create, retrieve, update, or delete a table in a Softr database.
- To **create**: provide \`databaseId\` and \`name\`. Optionally include \`primaryFieldName\` and \`fields\`.
- To **get**: provide \`databaseId\` and \`tableId\`.
- To **update**: provide \`databaseId\`, \`tableId\`, and new \`name\`/\`description\`.
- To **delete**: provide \`databaseId\`, \`tableId\`, and set \`delete\` to true.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      databaseId: z.string().describe('ID of the database'),
      tableId: z
        .string()
        .optional()
        .describe('ID of the table (required for get/update/delete)'),
      name: z
        .string()
        .optional()
        .describe('Table name (required for create, optional for update)'),
      description: z.string().optional().describe('Table description'),
      primaryFieldName: z
        .string()
        .optional()
        .describe('Name of the primary field (only for create)'),
      fields: z
        .array(fieldInputSchema)
        .optional()
        .describe('Fields to create with the table (only for create)'),
      delete: z.boolean().optional().describe('Set to true to delete the table')
    })
  )
  .output(
    z.object({
      table: tableOutputSchema.optional().describe('Table details (not returned on delete)'),
      deleted: z.boolean().optional().describe('True if table was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabaseClient({ token: ctx.auth.token });
    let { databaseId, tableId, name, description, primaryFieldName, fields } = ctx.input;

    let mapTable = (t: any) => ({
      tableId: t.id,
      name: t.name,
      description: t.description ?? null,
      primaryFieldId: t.primaryFieldId,
      defaultViewId: t.defaultViewId,
      fields: (t.fields || []).map((f: any) => ({
        fieldId: f.id,
        name: f.name,
        type: f.type,
        description: f.description ?? null,
        required: f.required,
        readonly: f.readonly
      })),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    });

    if (ctx.input.delete) {
      if (!tableId) throw new Error('tableId is required to delete a table.');
      await client.deleteTable(databaseId, tableId);
      return {
        output: { deleted: true },
        message: `Table \`${tableId}\` deleted successfully.`
      };
    }

    if (!tableId && name) {
      let result = await client.createTable(databaseId, {
        name,
        description,
        primaryFieldName,
        fields
      });
      let table = mapTable(result.data);
      return {
        output: { table },
        message: `Table **${table.name}** created successfully with ${table.fields.length} field(s).`
      };
    }

    if (tableId && (name || description !== undefined)) {
      let updateParams: { name?: string; description?: string } = {};
      if (name) updateParams.name = name;
      if (description !== undefined) updateParams.description = description;
      let result = await client.updateTable(databaseId, tableId, updateParams);
      let table = mapTable(result.data);
      return {
        output: { table },
        message: `Table **${table.name}** updated successfully.`
      };
    }

    if (tableId) {
      let result = await client.getTable(databaseId, tableId);
      let table = mapTable(result.data);
      return {
        output: { table },
        message: `Retrieved table **${table.name}** with ${table.fields.length} field(s).`
      };
    }

    throw new Error(
      'Invalid input: provide tableId (to get/update/delete) or name (to create).'
    );
  })
  .build();
