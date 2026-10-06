import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import {
  field,
  idNumber,
  invalid,
  malformed,
  numericId,
  records,
  required
} from '../lib/validation';
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
      success: z.boolean().optional().describe('Whether the operation succeeded'),
      tables: z
        .array(
          z.object({
            tableId: z.number().optional().describe('Table ID'),
            tableName: z.string().optional().describe('Table name'),
            projectId: z.number().nullable().optional().describe('Project ID')
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
    const client = createClient(ctx);
    const {
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
      const result = await client.listLookupTables({ page, perPage });
      const tables = records(result.items).map(t => ({
        tableId: idNumber(t.id),
        tableName: field(t, 'name', z.string()),
        projectId:
          t.project_id === undefined
            ? undefined
            : t.project_id === null
              ? null
              : idNumber(t.project_id)
      }));
      return {
        output: { success: true, tables },
        message: `Returned ${tables.length} lookup tables from this page.`
      };
    }
    if (action === 'create_table') {
      if (!columns) invalid('Columns are required for create_table.');
      const result = await client.createLookupTable({
        name: required(tableName, 'Table name'),
        projectId,
        schema: columns
      });
      return {
        output: { success: true, tableId: idNumber(result.id) },
        message: 'Created lookup table. This tool does not delete tables.'
      };
    }
    const id = numericId(tableId, 'tableId');
    if (action === 'list_rows') {
      const result = await client.listLookupTableRows(id, { page, perPage, filter });
      const rows = records(result.items);
      return {
        output: { success: true, rows },
        message: `Returned ${rows.length} rows from this page.`
      };
    }
    if (action === 'lookup_row') {
      if (!filter) invalid('Filter is required for lookup_row.');
      const row = await client.lookupRow(id, filter);
      idNumber(row.id);
      return { output: { success: true, row }, message: 'Retrieved the first matching row.' };
    }
    if (action === 'delete_row') {
      await client.deleteLookupTableRow(id, numericId(rowId, 'rowId'));
      return { output: { success: true }, message: 'Deleted lookup row.' };
    }
    if (!rowData) invalid('Row data is required.');
    const row =
      action === 'add_row'
        ? await client.addLookupTableRow(id, rowData)
        : await client.updateLookupTableRow(id, numericId(rowId, 'rowId'), rowData);
    const returnedId = idNumber(row.id);
    if (action === 'update_row' && String(returnedId) !== numericId(rowId, 'rowId'))
      malformed();
    return { output: { success: true, row }, message: `Row ${action} accepted.` };
  });
