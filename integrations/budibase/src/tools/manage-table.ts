import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapTable } from '../lib/models';
import { invalid } from '../lib/validation';
import { spec } from '../spec';

let tableOutputSchema = z.object({
  tableId: z.string().describe('Unique identifier of the table'),
  name: z.string().describe('Name of the table'),
  primaryDisplay: z.string().optional().describe('Column used as the primary display value'),
  schema: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Table column definitions keyed by column name')
});

export let manageTable = SlateTool.create(spec, {
  name: 'Manage Table',
  key: 'manage_table',
  description: `Create, retrieve, update, or delete a table within a Budibase application or workspace. Creation requires a name and schema ({} is an empty schema). Updates retain current metadata before applying supplied fields; a supplied schema replaces the column definitions.`,
  instructions: [
    'The appId is required for all operations to scope the request to the correct application.',
    'Schema is a record of column definitions keyed by column name. Each column has a "type" (string, number, boolean, datetime, etc.) and optional "constraints".',
    'Read-modify-write updates are not atomic; coordinate concurrent edits in the builder. Deletion removes table data.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      appId: z.string().describe('Application ID that the table belongs to'),
      action: z
        .enum(['create', 'get', 'update', 'delete'])
        .describe('The operation to perform'),
      tableId: z.string().optional().describe('Table ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Table name (required for create, optional for update)'),
      primaryDisplay: z
        .string()
        .optional()
        .describe('Column name to use as the primary display value'),
      schema: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Column definitions keyed by column name, e.g. { "Name": { "type": "string" }, "Age": { "type": "number" } }'
        )
    })
  )
  .output(
    z.object({
      table: tableOutputSchema.optional().describe('The table data (not returned for delete)'),
      deleted: z.boolean().optional().describe('Whether the table was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx, ctx.input.appId);
    let { action, tableId, name, primaryDisplay, schema } = ctx.input;

    if (action === 'create') {
      if (!name) invalid('Name is required to create a table');
      let table = await client.createTable({ name, primaryDisplay, schema });
      let mapped = mapTable(table);
      return {
        output: { table: mapped },
        message: `Created table **${mapped.name}** (${mapped.tableId}).`
      };
    }

    if (!tableId) invalid('tableId is required for get, update, and delete actions');

    if (action === 'get') {
      let table = await client.getTable(tableId);
      let mapped = mapTable(table);
      return {
        output: { table: mapped },
        message: `Retrieved table **${mapped.name}** with ${Object.keys(mapped.schema || {}).length} column(s).`
      };
    }

    if (action === 'update') {
      let updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (primaryDisplay !== undefined) updateData.primaryDisplay = primaryDisplay;
      if (schema !== undefined) updateData.schema = schema;
      let table = await client.updateTable(tableId, updateData);
      let mapped = mapTable(table);
      return {
        output: { table: mapped },
        message: `Updated table **${mapped.name}** (${mapped.tableId}).`
      };
    }

    await client.deleteTable(tableId);
    return {
      output: { deleted: true },
      message: `Deleted table **${tableId}**.`
    };
  })
  .build();
