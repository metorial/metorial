import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabaseClient } from '../lib/client';
import { spec } from '../spec';

let fieldSchema = z.object({
  fieldId: z.string().describe('Unique field identifier'),
  name: z.string().describe('Field name'),
  type: z.string().describe('Field type (e.g., SINGLE_LINE_TEXT, NUMBER, EMAIL, etc.)'),
  description: z.string().nullable().optional().describe('Field description'),
  required: z.boolean().optional().describe('Whether the field is required'),
  readonly: z.boolean().optional().describe('Whether the field is read-only')
});

let tableSchema = z.object({
  tableId: z.string().describe('Unique table identifier'),
  name: z.string().describe('Table name'),
  description: z.string().nullable().describe('Table description'),
  primaryFieldId: z.string().describe('ID of the primary field'),
  defaultViewId: z.string().describe('ID of the default view'),
  fields: z.array(fieldSchema).describe('Fields (columns) defined on the table'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let listTables = SlateTool.create(spec, {
  name: 'List Tables',
  key: 'list_tables',
  description: `Retrieve all tables in a specific Softr database, including their fields (schema). Useful for discovering available tables and understanding their structure before querying records.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      databaseId: z.string().describe('ID of the database to list tables from')
    })
  )
  .output(
    z.object({
      tables: z.array(tableSchema).describe('List of tables in the database')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabaseClient({ token: ctx.auth.token });

    let result = await client.listTables(ctx.input.databaseId);
    let tables = (result.data || []).map((t: any) => ({
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
    }));

    return {
      output: { tables },
      message: `Found **${tables.length}** table(s) in database \`${ctx.input.databaseId}\`.`
    };
  })
  .build();
