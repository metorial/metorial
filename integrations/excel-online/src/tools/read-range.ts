import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExcelClient } from '../lib/client';
import { spec } from '../spec';

export let readRange = SlateTool.create(spec, {
  name: 'Read Range',
  key: 'read_range',
  description: `Read cell values, formulas, and number formats from a specific range or the used range of a worksheet. Returns the cell data as a 2D array along with range metadata like address and dimensions.`,
  instructions: [
    'Provide a range address (e.g., "A1:C10") to read specific cells, or omit it to read the entire used range.',
    'Set valuesOnly to true when reading the used range to only get cells with values (ignores formatting-only cells).'
  ],
  constraints: [
    'Very large ranges may fail due to API resource limits.',
    'Only .xlsx workbooks on OneDrive for Business or SharePoint are supported.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workbookItemId: z.string().describe('The Drive item ID of the Excel workbook file'),
      worksheetIdOrName: z.string().describe('Worksheet ID or name to read from'),
      rangeAddress: z
        .string()
        .optional()
        .describe('Cell range address (e.g., "A1:C10"). If omitted, reads the used range.'),
      valuesOnly: z
        .boolean()
        .optional()
        .describe(
          'When reading the used range, only return cells with values (default: false)'
        ),
      sessionId: z.string().optional().describe('Optional workbook session ID')
    })
  )
  .output(
    z.object({
      address: z.string().describe('The range address that was read'),
      cellCount: z.number().describe('Total number of cells in the range'),
      rowCount: z.number().describe('Number of rows'),
      columnCount: z.number().describe('Number of columns'),
      values: z.array(z.array(z.any())).describe('2D array of cell values'),
      formulas: z.array(z.array(z.any())).optional().describe('2D array of cell formulas'),
      numberFormat: z
        .array(z.array(z.any()))
        .optional()
        .describe('2D array of number format strings'),
      text: z.array(z.array(z.any())).optional().describe('2D array of display text')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExcelClient({
      token: ctx.auth.token,
      driveId: ctx.config.driveId,
      siteId: ctx.config.siteId,
      sessionId: ctx.input.sessionId
    });

    let range: any;
    if (ctx.input.rangeAddress) {
      range = await client.getRange(
        ctx.input.workbookItemId,
        ctx.input.worksheetIdOrName,
        ctx.input.rangeAddress
      );
    } else {
      range = await client.getUsedRange(
        ctx.input.workbookItemId,
        ctx.input.worksheetIdOrName,
        ctx.input.valuesOnly
      );
    }

    return {
      output: {
        address: range.address,
        cellCount: range.cellCount,
        rowCount: range.rowCount,
        columnCount: range.columnCount,
        values: range.values,
        formulas: range.formulas,
        numberFormat: range.numberFormat,
        text: range.text
      },
      message: `Read range **${range.address}** (${range.rowCount} rows × ${range.columnCount} columns, ${range.cellCount} cells).`
    };
  })
  .build();
