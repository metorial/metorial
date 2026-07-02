import { SlateTool } from 'slates';
import { z } from 'zod';
import { GigasheetClient } from '../lib/client';
import { spec } from '../spec';

export let modifyRows = SlateTool.create(spec, {
  name: 'Modify Rows',
  key: 'modify_rows',
  description: `Add, update, or delete rows in a Gigasheet sheet. Supports appending new rows, inserting blank rows, updating individual cells, upserting rows, deleting specific rows, or deleting rows matching/not matching a filter.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sheetHandle: z.string().describe('Handle of the sheet to modify'),
      action: z
        .enum([
          'append',
          'append_from_sheet',
          'insert_blank_row',
          'update_cell',
          'delete_rows',
          'delete_rows_matching_filter',
          'delete_rows_not_matching_filter'
        ])
        .describe('The row modification action to perform'),
      rows: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Rows to append (array of objects keyed by column name)'),
      sourceSheetHandle: z
        .string()
        .optional()
        .describe('Handle of the source sheet for append_from_sheet'),
      rowIndex: z.number().optional().describe('Row index for insert_blank_row'),
      columnName: z.string().optional().describe('Column name for update_cell'),
      rowId: z.string().optional().describe('Row ID for update_cell'),
      cellValue: z.unknown().optional().describe('New value for update_cell'),
      rowIds: z.array(z.string()).optional().describe('Row IDs to delete for delete_rows'),
      filterModel: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Filter model for filter-based row deletion')
    })
  )
  .output(
    z.object({
      result: z.record(z.string(), z.unknown()).optional().describe('Operation result'),
      success: z.boolean().describe('Whether the operation completed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GigasheetClient({ token: ctx.auth.token });
    let result: Record<string, unknown> | undefined;

    switch (ctx.input.action) {
      case 'append':
        if (!ctx.input.rows || ctx.input.rows.length === 0) {
          throw new Error('rows is required for append');
        }
        result = await client.appendRowsByName(ctx.input.sheetHandle, ctx.input.rows);
        break;

      case 'append_from_sheet':
        if (!ctx.input.sourceSheetHandle) {
          throw new Error('sourceSheetHandle is required for append_from_sheet');
        }
        result = await client.appendFromSheet(
          ctx.input.sheetHandle,
          ctx.input.sourceSheetHandle
        );
        break;

      case 'insert_blank_row':
        result = await client.insertBlankRow(ctx.input.sheetHandle, ctx.input.rowIndex);
        break;

      case 'update_cell':
        if (!ctx.input.columnName || !ctx.input.rowId) {
          throw new Error('columnName and rowId are required for update_cell');
        }
        result = await client.updateCellByName(
          ctx.input.sheetHandle,
          ctx.input.columnName,
          ctx.input.rowId,
          ctx.input.cellValue
        );
        break;

      case 'delete_rows':
        if (!ctx.input.rowIds || ctx.input.rowIds.length === 0) {
          throw new Error('rowIds is required for delete_rows');
        }
        result = await client.deleteRows(ctx.input.sheetHandle, ctx.input.rowIds);
        break;

      case 'delete_rows_matching_filter':
        if (!ctx.input.filterModel) {
          throw new Error('filterModel is required for delete_rows_matching_filter');
        }
        result = await client.deleteRowsMatchingFilter(
          ctx.input.sheetHandle,
          ctx.input.filterModel
        );
        break;

      case 'delete_rows_not_matching_filter':
        if (!ctx.input.filterModel) {
          throw new Error('filterModel is required for delete_rows_not_matching_filter');
        }
        result = await client.deleteRowsNotMatchingFilter(
          ctx.input.sheetHandle,
          ctx.input.filterModel
        );
        break;
    }

    return {
      output: {
        result,
        success: true
      },
      message: `Successfully performed **${ctx.input.action}** on sheet.`
    };
  })
  .build();
