import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExcelClient } from '../lib/client';
import { spec } from '../spec';

export let writeRange = SlateTool.create(spec, {
  name: 'Write Range',
  key: 'write_range',
  description: `Write values, formulas, or number formats to a specific cell range in a worksheet. Can also clear or sort a range. The dimensions of the provided arrays must match the target range dimensions.`,
  instructions: [
    'Provide values as a 2D array matching the range dimensions (e.g., for "A1:B2" provide [[val1, val2], [val3, val4]]).',
    'Use formulas to set cell formulas (e.g., [["=SUM(A1:A10)"]]).',
    'Use the "clear" action to erase a range, optionally clearing only contents, formats, or all.',
    'Use the "sort" action to sort a range by one or more columns.'
  ],
  constraints: [
    'Writing to unbounded ranges (e.g., entire columns like "A:A") is not allowed.',
    'The values/formulas array dimensions must match the range size exactly.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      workbookItemId: z.string().describe('The Drive item ID of the Excel workbook file'),
      worksheetIdOrName: z.string().describe('Worksheet ID or name to write to'),
      rangeAddress: z.string().describe('Target cell range address (e.g., "A1:C3")'),
      action: z
        .enum(['write', 'clear', 'sort'])
        .default('write')
        .describe('Operation: write values, clear range, or sort range'),
      values: z.array(z.array(z.any())).optional().describe('2D array of values to write'),
      formulas: z.array(z.array(z.any())).optional().describe('2D array of formulas to set'),
      numberFormat: z
        .array(z.array(z.any()))
        .optional()
        .describe('2D array of number format strings to apply'),
      clearApplyTo: z
        .enum(['All', 'Formats', 'Contents'])
        .optional()
        .describe('What to clear (for clear action, default: All)'),
      sortFields: z
        .array(
          z.object({
            key: z.number().describe('Zero-based column index to sort by'),
            ascending: z.boolean().optional().describe('Sort ascending (default: true)')
          })
        )
        .optional()
        .describe('Sort fields (for sort action)'),
      sessionId: z.string().optional().describe('Optional workbook session ID')
    })
  )
  .output(
    z.object({
      address: z.string().optional().describe('The range address that was modified'),
      rowCount: z.number().optional().describe('Number of rows in the range'),
      columnCount: z.number().optional().describe('Number of columns in the range'),
      values: z.array(z.array(z.any())).optional().describe('Updated cell values after write'),
      cleared: z.boolean().optional().describe('Whether the range was cleared'),
      sorted: z.boolean().optional().describe('Whether the range was sorted')
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
      case 'write': {
        let data: any = {};
        if (ctx.input.values) data.values = ctx.input.values;
        if (ctx.input.formulas) data.formulas = ctx.input.formulas;
        if (ctx.input.numberFormat) data.numberFormat = ctx.input.numberFormat;

        let range = await client.updateRange(
          ctx.input.workbookItemId,
          ctx.input.worksheetIdOrName,
          ctx.input.rangeAddress,
          data
        );

        return {
          output: {
            address: range.address,
            rowCount: range.rowCount,
            columnCount: range.columnCount,
            values: range.values
          },
          message: `Wrote to range **${range.address}** (${range.rowCount} × ${range.columnCount}).`
        };
      }
      case 'clear': {
        await client.clearRange(
          ctx.input.workbookItemId,
          ctx.input.worksheetIdOrName,
          ctx.input.rangeAddress,
          ctx.input.clearApplyTo
        );
        return {
          output: { cleared: true, address: ctx.input.rangeAddress },
          message: `Cleared range **${ctx.input.rangeAddress}** (${ctx.input.clearApplyTo || 'All'}).`
        };
      }
      case 'sort': {
        if (!ctx.input.sortFields || ctx.input.sortFields.length === 0) {
          throw new Error('sortFields is required for sort action');
        }
        await client.sortRange(
          ctx.input.workbookItemId,
          ctx.input.worksheetIdOrName,
          ctx.input.rangeAddress,
          ctx.input.sortFields
        );
        return {
          output: { sorted: true, address: ctx.input.rangeAddress },
          message: `Sorted range **${ctx.input.rangeAddress}** by ${ctx.input.sortFields.length} field(s).`
        };
      }
    }
  })
  .build();
