import { SlateTool } from 'slates';
import { z } from 'zod';
import { SharePointClient } from '../lib/client';
import { spec } from '../spec';

let columnOutputSchema = z.object({
  columnId: z.string().describe('Column ID'),
  columnName: z.string().describe('Internal name of the column'),
  displayName: z.string().describe('Display name of the column'),
  columnDescription: z.string().optional().describe('Column description'),
  columnType: z
    .string()
    .optional()
    .describe('Column type (text, number, boolean, dateTime, choice, etc.)'),
  required: z.boolean().optional().describe('Whether the column is required'),
  readOnly: z.boolean().optional().describe('Whether the column is read-only'),
  hidden: z.boolean().optional().describe('Whether the column is hidden'),
  choices: z.array(z.string()).optional().describe('Available choices (for choice columns)')
});

export let manageColumns = SlateTool.create(spec, {
  name: 'Manage Columns',
  key: 'manage_columns',
  description: `List, create, update, or delete columns (fields) on a SharePoint list. Columns define the schema and metadata structure of a list. Supports various column types including text, number, boolean, dateTime, choice, currency, and personOrGroup.`,
  instructions: [
    'Set **action** to "list" to view all columns, "create" to add a new column, "update" to modify an existing column, or "delete" to remove a column.',
    'For "create", provide **columnName**, **columnType**, and optionally **choices** (for choice columns).',
    'For "update", provide **columnId** and the fields to update.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'delete'])
        .describe('Column action to perform'),
      siteId: z.string().describe('SharePoint site ID'),
      listId: z.string().describe('SharePoint list ID'),
      columnId: z.string().optional().describe('Column ID (required for update, delete)'),
      columnName: z.string().optional().describe('Column name (for create)'),
      columnDescription: z
        .string()
        .optional()
        .describe('Column description (for create, update)'),
      columnType: z
        .enum(['text', 'number', 'boolean', 'dateTime', 'choice', 'currency', 'personOrGroup'])
        .optional()
        .describe('Column type (for create)'),
      required: z
        .boolean()
        .optional()
        .describe('Whether the column is required (for create, update)'),
      choices: z
        .array(z.string())
        .optional()
        .describe('Available choices for choice columns (for create)')
    })
  )
  .output(
    z.object({
      column: columnOutputSchema.optional().describe('Column details (for create, update)'),
      columns: z
        .array(columnOutputSchema)
        .optional()
        .describe('List of columns (for list action)'),
      deleted: z.boolean().optional().describe('Whether the column was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SharePointClient(ctx.auth.token);
    let {
      action,
      siteId,
      listId,
      columnId,
      columnName,
      columnDescription,
      columnType,
      required,
      choices
    } = ctx.input;

    let detectType = (col: any): string => {
      if (col.text) return 'text';
      if (col.number) return 'number';
      if (col.boolean) return 'boolean';
      if (col.dateTime) return 'dateTime';
      if (col.choice) return 'choice';
      if (col.currency) return 'currency';
      if (col.personOrGroup) return 'personOrGroup';
      if (col.lookup) return 'lookup';
      if (col.calculated) return 'calculated';
      return 'unknown';
    };

    let mapColumn = (col: any) => ({
      columnId: col.id,
      columnName: col.name,
      displayName: col.displayName || col.name,
      columnDescription: col.description,
      columnType: detectType(col),
      required: col.required,
      readOnly: col.readOnly,
      hidden: col.hidden,
      choices: col.choice?.choices
    });

    switch (action) {
      case 'list': {
        let data = await client.listColumns(siteId, listId);
        let columns = (data.value || []).map(mapColumn);
        return {
          output: { columns },
          message: `Found **${columns.length}** column(s) on the list.`
        };
      }

      case 'create': {
        if (!columnName) throw new Error('columnName is required for create.');
        if (!columnType) throw new Error('columnType is required for create.');
        let column = await client.createColumn(siteId, listId, {
          name: columnName,
          description: columnDescription,
          type: columnType,
          required,
          choices
        });
        return {
          output: { column: mapColumn(column) },
          message: `Created column **${columnName}** (${columnType}).`
        };
      }

      case 'update': {
        if (!columnId) throw new Error('columnId is required for update.');
        let updates: { description?: string; required?: boolean } = {};
        if (columnDescription !== undefined) updates.description = columnDescription;
        if (required !== undefined) updates.required = required;
        let column = await client.updateColumn(siteId, listId, columnId, updates);
        return {
          output: { column: mapColumn(column) },
          message: `Updated column \`${columnId}\`.`
        };
      }

      case 'delete': {
        if (!columnId) throw new Error('columnId is required for delete.');
        await client.deleteColumn(siteId, listId, columnId);
        return {
          output: { deleted: true },
          message: `Deleted column \`${columnId}\`.`
        };
      }
    }
  })
  .build();
