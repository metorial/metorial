import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExcelClient } from '../lib/client';
import { spec } from '../spec';

export let manageTableColumns = SlateTool.create(spec, {
  name: 'Manage Table Columns',
  key: 'manage_table_columns',
  description: `List, add, or delete columns in a structured Excel table. View the current column structure, add new columns with optional initial values, or remove columns.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      workbookItemId: z.string().describe('The Drive item ID of the Excel workbook file'),
      tableIdOrName: z.string().describe('Table ID or name'),
      action: z.enum(['list', 'add', 'delete']).describe('Operation to perform'),
      columnName: z.string().optional().describe('Column name (for add or delete)'),
      columnValues: z
        .array(z.array(z.any()))
        .optional()
        .describe('Column values as 2D array [[val1], [val2], ...] (for add)'),
      columnIndex: z
        .number()
        .optional()
        .describe('Zero-based position to insert the column at (for add)'),
      columnIdOrName: z
        .string()
        .optional()
        .describe('Column ID or name to delete (for delete)'),
      sessionId: z.string().optional().describe('Optional workbook session ID')
    })
  )
  .output(
    z.object({
      columns: z
        .array(
          z.object({
            columnId: z.string(),
            name: z.string(),
            index: z.number()
          })
        )
        .optional()
        .describe('List of table columns (for list)'),
      column: z
        .object({
          columnId: z.string(),
          name: z.string(),
          index: z.number()
        })
        .optional()
        .describe('Added column details (for add)'),
      deleted: z.boolean().optional().describe('Whether the column was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExcelClient({
      token: ctx.auth.token,
      driveId: ctx.config.driveId,
      siteId: ctx.config.siteId,
      sessionId: ctx.input.sessionId
    });

    let mapColumn = (c: any) => ({
      columnId: c.id,
      name: c.name,
      index: c.index
    });

    switch (ctx.input.action) {
      case 'list': {
        let columns = await client.getTableColumns(
          ctx.input.workbookItemId,
          ctx.input.tableIdOrName
        );
        return {
          output: { columns: columns.map(mapColumn) },
          message: `Found **${columns.length}** column(s) in table **${ctx.input.tableIdOrName}**.`
        };
      }
      case 'add': {
        if (!ctx.input.columnName) throw new Error('columnName is required for add action');
        let normalizedColumnValues = ctx.input.columnValues;
        if (normalizedColumnValues?.length) {
          let existingRows = await client.getTableRows(
            ctx.input.workbookItemId,
            ctx.input.tableIdOrName
          );
          let rowCount = Array.isArray(existingRows.value) ? existingRows.value.length : 0;
          if (normalizedColumnValues.length === rowCount) {
            normalizedColumnValues = [[ctx.input.columnName], ...normalizedColumnValues];
          }
        }
        let col = await client.addTableColumn(
          ctx.input.workbookItemId,
          ctx.input.tableIdOrName,
          ctx.input.columnName,
          normalizedColumnValues,
          ctx.input.columnIndex
        );
        return {
          output: { column: mapColumn(col) },
          message: `Added column **${col.name}** to table **${ctx.input.tableIdOrName}**.`
        };
      }
      case 'delete': {
        let idOrName = ctx.input.columnIdOrName || ctx.input.columnName;
        if (!idOrName)
          throw new Error('columnIdOrName or columnName is required for delete action');
        await client.deleteTableColumn(
          ctx.input.workbookItemId,
          ctx.input.tableIdOrName,
          idOrName
        );
        return {
          output: { deleted: true },
          message: `Deleted column **${idOrName}** from table **${ctx.input.tableIdOrName}**.`
        };
      }
    }
  })
  .build();
