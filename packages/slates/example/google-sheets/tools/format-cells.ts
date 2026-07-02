import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { spec } from '../spec';

let colorSchema = z
  .object({
    red: z.number().min(0).max(1).optional().describe('Red component (0-1)'),
    green: z.number().min(0).max(1).optional().describe('Green component (0-1)'),
    blue: z.number().min(0).max(1).optional().describe('Blue component (0-1)'),
    alpha: z.number().min(0).max(1).optional().describe('Alpha/opacity (0-1)')
  })
  .optional();

export let formatCellsTool = SlateTool.create(spec, {
  name: 'Format Cells',
  key: 'format_cells',
  description: `Applies formatting to cells in a Google Sheets spreadsheet.
Supports text formatting (bold, italic, font, color), cell background, alignment, number formats, and borders.`,
  instructions: [
    'Colors use RGB values from 0 to 1 (e.g., red: 1, green: 0, blue: 0 for pure red)',
    'Number format patterns follow Google Sheets format codes'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      spreadsheetId: z.string().describe('ID of the spreadsheet'),
      sheetId: z.number().describe('ID of the sheet containing the cells'),
      startRowIndex: z.number().describe('Start row index (0-based)'),
      endRowIndex: z.number().describe('End row index (exclusive)'),
      startColumnIndex: z.number().describe('Start column index (0-based)'),
      endColumnIndex: z.number().describe('End column index (exclusive)'),
      backgroundColor: colorSchema.describe('Background color'),
      textFormat: z
        .object({
          foregroundColor: colorSchema.describe('Text color'),
          fontFamily: z.string().optional().describe('Font family (e.g., "Arial")'),
          fontSize: z.number().optional().describe('Font size in points'),
          bold: z.boolean().optional().describe('Bold text'),
          italic: z.boolean().optional().describe('Italic text'),
          strikethrough: z.boolean().optional().describe('Strikethrough text'),
          underline: z.boolean().optional().describe('Underlined text')
        })
        .optional()
        .describe('Text formatting'),
      horizontalAlignment: z
        .enum(['LEFT', 'CENTER', 'RIGHT'])
        .optional()
        .describe('Horizontal alignment'),
      verticalAlignment: z
        .enum(['TOP', 'MIDDLE', 'BOTTOM'])
        .optional()
        .describe('Vertical alignment'),
      wrapStrategy: z
        .enum(['OVERFLOW_CELL', 'CLIP', 'WRAP'])
        .optional()
        .describe('Text wrapping'),
      numberFormat: z
        .object({
          type: z
            .enum([
              'TEXT',
              'NUMBER',
              'PERCENT',
              'CURRENCY',
              'DATE',
              'TIME',
              'DATE_TIME',
              'SCIENTIFIC'
            ])
            .describe('Format type'),
          pattern: z.string().optional().describe('Format pattern (e.g., "#,##0.00")')
        })
        .optional()
        .describe('Number format')
    })
  )
  .output(
    z.object({
      formatted: z.boolean().describe('Whether formatting was applied successfully'),
      range: z.string().describe('Description of the formatted range')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient({ token: ctx.auth.token });

    let format: Record<string, unknown> = {};

    if (ctx.input.backgroundColor) {
      format.backgroundColor = ctx.input.backgroundColor;
    }
    if (ctx.input.textFormat) {
      format.textFormat = ctx.input.textFormat;
    }
    if (ctx.input.horizontalAlignment) {
      format.horizontalAlignment = ctx.input.horizontalAlignment;
    }
    if (ctx.input.verticalAlignment) {
      format.verticalAlignment = ctx.input.verticalAlignment;
    }
    if (ctx.input.wrapStrategy) {
      format.wrapStrategy = ctx.input.wrapStrategy;
    }
    if (ctx.input.numberFormat) {
      format.numberFormat = ctx.input.numberFormat;
    }

    await client.formatCells(
      ctx.input.spreadsheetId,
      {
        sheetId: ctx.input.sheetId,
        startRowIndex: ctx.input.startRowIndex,
        endRowIndex: ctx.input.endRowIndex,
        startColumnIndex: ctx.input.startColumnIndex,
        endColumnIndex: ctx.input.endColumnIndex
      },
      format
    );

    let rowCount = ctx.input.endRowIndex - ctx.input.startRowIndex;
    let colCount = ctx.input.endColumnIndex - ctx.input.startColumnIndex;

    let output = {
      formatted: true,
      range: `${rowCount} row(s) x ${colCount} column(s) starting at row ${ctx.input.startRowIndex}, column ${ctx.input.startColumnIndex}`
    };

    return {
      output,
      message: `Applied formatting to **${rowCount * colCount}** cells.`
    };
  })
  .build();
