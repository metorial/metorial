import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { googleSheetsActionScopes } from '../scopes';
import { spec } from '../spec';

let colorSchema = z
  .object({
    red: z.number().min(0).max(1).optional().describe('Red component (0-1)'),
    green: z.number().min(0).max(1).optional().describe('Green component (0-1)'),
    blue: z.number().min(0).max(1).optional().describe('Blue component (0-1)'),
    alpha: z.number().min(0).max(1).optional().describe('Alpha/opacity (0-1)')
  })
  .optional();

let borderStyleSchema = z
  .object({
    style: z
      .enum(['DOTTED', 'DASHED', 'SOLID', 'SOLID_MEDIUM', 'SOLID_THICK', 'DOUBLE', 'NONE'])
      .optional()
      .describe('Border line style'),
    color: colorSchema.describe('Border color')
  })
  .optional();

export let formatCells = SlateTool.create(spec, {
  name: 'Format Cells',
  key: 'format_cells',
  description: `Applies formatting to cells in a spreadsheet range. Supports text styling (bold, italic, font, color), cell backgrounds, number formats, text alignment, borders, and text wrapping. Multiple formatting options can be applied in a single call.`,
  instructions: [
    'Provide the sheetId (numeric) and the row/column indices (0-based) to define the range.',
    'startRowIndex and startColumnIndex are inclusive; endRowIndex and endColumnIndex are exclusive.',
    'For example, to format cell A1: startRowIndex=0, endRowIndex=1, startColumnIndex=0, endColumnIndex=1.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleSheetsActionScopes.formatCells)
  .input(
    z.object({
      spreadsheetId: z.string().describe('Unique ID of the spreadsheet'),
      sheetId: z.number().describe('Numeric ID of the sheet tab'),
      startRowIndex: z.number().describe('Start row index (0-based, inclusive)'),
      endRowIndex: z.number().describe('End row index (0-based, exclusive)'),
      startColumnIndex: z.number().describe('Start column index (0-based, inclusive)'),
      endColumnIndex: z.number().describe('End column index (0-based, exclusive)'),
      bold: z.boolean().optional().describe('Make text bold'),
      italic: z.boolean().optional().describe('Make text italic'),
      strikethrough: z.boolean().optional().describe('Apply strikethrough to text'),
      underline: z.boolean().optional().describe('Underline text'),
      fontSize: z.number().optional().describe('Font size in points'),
      fontFamily: z
        .string()
        .optional()
        .describe('Font family (e.g., "Arial", "Times New Roman")'),
      foregroundColor: colorSchema.describe('Text color'),
      backgroundColor: colorSchema.describe('Cell background color'),
      horizontalAlignment: z
        .enum(['LEFT', 'CENTER', 'RIGHT'])
        .optional()
        .describe('Horizontal text alignment'),
      verticalAlignment: z
        .enum(['TOP', 'MIDDLE', 'BOTTOM'])
        .optional()
        .describe('Vertical text alignment'),
      wrapStrategy: z
        .enum(['OVERFLOW_CELL', 'LEGACY_WRAP', 'CLIP', 'WRAP'])
        .optional()
        .describe('How text wrapping is handled'),
      numberFormatType: z
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
        .optional()
        .describe('Number format type'),
      numberFormatPattern: z
        .string()
        .optional()
        .describe('Custom number format pattern (e.g., "#,##0.00", "yyyy-mm-dd")'),
      topBorder: borderStyleSchema.describe('Top border style and color'),
      bottomBorder: borderStyleSchema.describe('Bottom border style and color'),
      leftBorder: borderStyleSchema.describe('Left border style and color'),
      rightBorder: borderStyleSchema.describe('Right border style and color')
    })
  )
  .output(
    z.object({
      spreadsheetId: z.string().describe('ID of the formatted spreadsheet'),
      formattedRange: z.string().describe('Description of the formatted range')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient(ctx.auth.token);
    let input = ctx.input;

    let cellFormat: Record<string, any> = {};
    let fields: string[] = [];

    // Text format
    let textFormat: Record<string, any> = {};
    let textFields: string[] = [];

    if (input.bold !== undefined) {
      textFormat.bold = input.bold;
      textFields.push('bold');
    }
    if (input.italic !== undefined) {
      textFormat.italic = input.italic;
      textFields.push('italic');
    }
    if (input.strikethrough !== undefined) {
      textFormat.strikethrough = input.strikethrough;
      textFields.push('strikethrough');
    }
    if (input.underline !== undefined) {
      textFormat.underline = input.underline;
      textFields.push('underline');
    }
    if (input.fontSize !== undefined) {
      textFormat.fontSize = input.fontSize;
      textFields.push('fontSize');
    }
    if (input.fontFamily !== undefined) {
      textFormat.fontFamily = input.fontFamily;
      textFields.push('fontFamily');
    }
    if (input.foregroundColor) {
      textFormat.foregroundColorStyle = { rgbColor: input.foregroundColor };
      textFields.push('foregroundColorStyle');
    }

    if (textFields.length > 0) {
      cellFormat.textFormat = textFormat;
      fields.push(...textFields.map(f => `userEnteredFormat.textFormat.${f}`));
    }

    if (input.backgroundColor) {
      cellFormat.backgroundColorStyle = { rgbColor: input.backgroundColor };
      fields.push('userEnteredFormat.backgroundColorStyle');
    }

    if (input.horizontalAlignment) {
      cellFormat.horizontalAlignment = input.horizontalAlignment;
      fields.push('userEnteredFormat.horizontalAlignment');
    }
    if (input.verticalAlignment) {
      cellFormat.verticalAlignment = input.verticalAlignment;
      fields.push('userEnteredFormat.verticalAlignment');
    }
    if (input.wrapStrategy) {
      cellFormat.wrapStrategy = input.wrapStrategy;
      fields.push('userEnteredFormat.wrapStrategy');
    }

    if (input.numberFormatType || input.numberFormatPattern) {
      cellFormat.numberFormat = {
        type: input.numberFormatType ?? 'NUMBER',
        pattern: input.numberFormatPattern
      };
      fields.push('userEnteredFormat.numberFormat');
    }

    // Borders
    let borders: Record<string, any> = {};
    let hasBorders = false;
    let buildBorder = (b: { style?: string; color?: Record<string, any> } | undefined) => {
      if (!b) return undefined;
      let result: Record<string, any> = {};
      if (b.style) result.style = b.style;
      if (b.color) result.colorStyle = { rgbColor: b.color };
      return result;
    };
    if (input.topBorder) {
      borders.top = buildBorder(input.topBorder);
      hasBorders = true;
    }
    if (input.bottomBorder) {
      borders.bottom = buildBorder(input.bottomBorder);
      hasBorders = true;
    }
    if (input.leftBorder) {
      borders.left = buildBorder(input.leftBorder);
      hasBorders = true;
    }
    if (input.rightBorder) {
      borders.right = buildBorder(input.rightBorder);
      hasBorders = true;
    }

    if (hasBorders) {
      cellFormat.borders = borders;
      fields.push('userEnteredFormat.borders');
    }

    if (fields.length === 0) {
      throw new Error('At least one formatting option must be provided');
    }

    await client.batchUpdate(input.spreadsheetId, [
      {
        repeatCell: {
          range: {
            sheetId: input.sheetId,
            startRowIndex: input.startRowIndex,
            endRowIndex: input.endRowIndex,
            startColumnIndex: input.startColumnIndex,
            endColumnIndex: input.endColumnIndex
          },
          cell: {
            userEnteredFormat: cellFormat
          },
          fields: fields.join(',')
        }
      }
    ]);

    let rangeDesc = `Sheet ${input.sheetId} [${input.startRowIndex}:${input.endRowIndex}, ${input.startColumnIndex}:${input.endColumnIndex}]`;

    return {
      output: {
        spreadsheetId: input.spreadsheetId,
        formattedRange: rangeDesc
      },
      message: `Applied formatting to ${rangeDesc}: ${fields.map(f => f.replace('userEnteredFormat.', '')).join(', ')}.`
    };
  })
  .build();
