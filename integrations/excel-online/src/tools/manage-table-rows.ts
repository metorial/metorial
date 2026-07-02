import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExcelClient } from '../lib/client';
import { spec } from '../spec';

export let manageTableRows = SlateTool.create(spec, {
  name: 'Manage Table Rows',
  key: 'manage_table_rows',
  description: `Add or delete rows in a structured Excel table. Add one or more rows at a specific position or at the end of the table, or delete a row by its index.`,
  instructions: [
    'To add rows, provide a 2D array where each inner array is one row of values matching the table column count.',
    'Specify insertIndex to insert at a specific position (zero-based), or omit to append at the end.',
    'To delete a row, provide the zero-based rowIndex.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      workbookItemId: z.string().describe('The Drive item ID of the Excel workbook file'),
      tableIdOrName: z.string().describe('Table ID or name'),
      action: z.enum(['add', 'delete']).describe('Whether to add or delete rows'),
      values: z
        .array(z.array(z.any()))
        .optional()
        .describe('2D array of row values to add (for add action)'),
      insertIndex: z
        .number()
        .optional()
        .describe('Zero-based position to insert rows at (for add action, omit to append)'),
      rowIndex: z
        .number()
        .optional()
        .describe('Zero-based index of the row to delete (for delete action)'),
      sessionId: z.string().optional().describe('Optional workbook session ID')
    })
  )
  .output(
    z.object({
      addedRowCount: z.number().optional().describe('Number of rows added'),
      addedValues: z.array(z.array(z.any())).optional().describe('Values of the added rows'),
      deleted: z.boolean().optional().describe('Whether the row was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExcelClient({
      token: ctx.auth.token,
      driveId: ctx.config.driveId,
      siteId: ctx.config.siteId,
      sessionId: ctx.input.sessionId
    });

    switch (ctx.input.action) {
      case 'add': {
        if (!ctx.input.values || ctx.input.values.length === 0) {
          throw new Error('values is required for add action');
        }
        let result = await client.addTableRows(
          ctx.input.workbookItemId,
          ctx.input.tableIdOrName,
          ctx.input.values,
          ctx.input.insertIndex
        );
        let addedValues = result.values || ctx.input.values;
        return {
          output: { addedRowCount: ctx.input.values.length, addedValues },
          message: `Added **${ctx.input.values.length}** row(s) to table **${ctx.input.tableIdOrName}**.`
        };
      }
      case 'delete': {
        if (ctx.input.rowIndex === undefined) {
          throw new Error('rowIndex is required for delete action');
        }
        await client.deleteTableRow(
          ctx.input.workbookItemId,
          ctx.input.tableIdOrName,
          ctx.input.rowIndex
        );
        return {
          output: { deleted: true },
          message: `Deleted row at index **${ctx.input.rowIndex}** from table **${ctx.input.tableIdOrName}**.`
        };
      }
    }
  })
  .build();
