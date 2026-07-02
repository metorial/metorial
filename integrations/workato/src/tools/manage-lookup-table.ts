import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { spec } from '../spec';

export let manageLookupTableTool = SlateTool.create(spec, {
  name: 'Manage Lookup Table',
  key: 'manage_lookup_table',
  description: `List lookup tables, create new ones, or manage rows within a lookup table. Lookup tables store reference data used in recipes (e.g. status code mappings, region configurations).`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_tables',
          'create_table',
          'list_rows',
          'lookup_row',
          'add_row',
          'update_row',
          'delete_row'
        ])
        .describe('Action to perform'),
      tableId: z.string().optional().describe('Lookup table ID (required for row operations)'),
      tableName: z
        .string()
        .optional()
        .describe('Name for the new table (required for create_table)'),
      projectId: z.number().optional().describe('Project ID for the new table'),
      columns: z
        .array(z.object({ label: z.string() }))
        .optional()
        .describe('Column schema for new table (required for create_table)'),
      rowId: z.string().optional().describe('Row ID (required for update_row/delete_row)'),
      rowData: z
        .record(z.string(), z.string())
        .optional()
        .describe('Row data as key-value pairs (for add_row/update_row)'),
      filter: z
        .record(z.string(), z.string())
        .optional()
        .describe('Filter criteria as key-value pairs (for list_rows/lookup_row)'),
      page: z.number().optional().describe('Page number for listing'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      tables: z
        .array(
          z.object({
            tableId: z.number().describe('Table ID'),
            tableName: z.string().describe('Table name'),
            projectId: z.number().nullable().describe('Project ID')
          })
        )
        .optional()
        .describe('List of lookup tables'),
      rows: z.array(z.record(z.string(), z.unknown())).optional().describe('List of rows'),
      row: z.record(z.string(), z.unknown()).optional().describe('Single row result'),
      tableId: z.number().optional().describe('ID of created table')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let {
      action,
      tableId,
      tableName,
      projectId,
      columns,
      rowId,
      rowData,
      filter,
      page,
      perPage
    } = ctx.input;

    if (action === 'list_tables') {
      let result = await client.listLookupTables({ page, perPage });
      let items = Array.isArray(result) ? result : (result.items ?? result.data ?? []);
      let tables = items.map((t: any) => ({
        tableId: t.id,
        tableName: t.name,
        projectId: t.project_id ?? null
      }));
      return {
        output: { success: true, tables },
        message: `Found **${tables.length}** lookup tables.`
      };
    }

    if (action === 'create_table') {
      if (!tableName || !columns)
        throw new Error('Table name and columns are required for create_table');
      let result = await client.createLookupTable({
        name: tableName,
        projectId,
        schema: columns
      });
      let created = result.result ?? result;
      return {
        output: { success: true, tableId: created.id },
        message: `Created lookup table **${tableName}** with ID ${created.id}.`
      };
    }

    if (!tableId) throw new Error('Table ID is required for row operations');

    if (action === 'list_rows') {
      let result = await client.listLookupTableRows(tableId, { page, perPage, filter });
      let items = Array.isArray(result)
        ? result
        : (result.items ?? result.data ?? result.rows ?? []);
      return {
        output: { success: true, rows: items },
        message: `Found **${items.length}** rows in lookup table ${tableId}.`
      };
    }

    if (action === 'lookup_row') {
      if (!filter) throw new Error('Filter is required for lookup_row');
      let result = await client.lookupRow(tableId, filter);
      return {
        output: { success: true, row: result },
        message: `Found matching row in lookup table ${tableId}.`
      };
    }

    if (action === 'add_row') {
      if (!rowData) throw new Error('Row data is required for add_row');
      let result = await client.addLookupTableRow(tableId, rowData);
      return {
        output: { success: true, row: result },
        message: `Added row to lookup table ${tableId}.`
      };
    }

    if (action === 'update_row') {
      if (!rowId || !rowData)
        throw new Error('Row ID and row data are required for update_row');
      let result = await client.updateLookupTableRow(tableId, rowId, rowData);
      return {
        output: { success: true, row: result },
        message: `Updated row ${rowId} in lookup table ${tableId}.`
      };
    }

    if (action === 'delete_row') {
      if (!rowId) throw new Error('Row ID is required for delete_row');
      await client.deleteLookupTableRow(tableId, rowId);
      return {
        output: { success: true },
        message: `Deleted row ${rowId} from lookup table ${tableId}.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  });
