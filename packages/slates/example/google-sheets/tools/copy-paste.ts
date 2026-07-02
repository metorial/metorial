import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { spec } from '../spec';

export let copyPasteTool = SlateTool.create(spec, {
  name: 'Copy and Paste',
  key: 'copy_paste',
  description: `Copies a range of cells and pastes them to another location in a Google Sheets spreadsheet.
Supports various paste types including values only, format only, formulas only, and transposing data.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      spreadsheetId: z.string().describe('ID of the spreadsheet'),
      sourceSheetId: z.number().describe('Sheet ID of the source range'),
      sourceStartRowIndex: z.number().describe('Source start row index (0-based)'),
      sourceEndRowIndex: z.number().describe('Source end row index (exclusive)'),
      sourceStartColumnIndex: z.number().describe('Source start column index (0-based)'),
      sourceEndColumnIndex: z.number().describe('Source end column index (exclusive)'),
      destinationSheetId: z.number().describe('Sheet ID of the destination range'),
      destinationStartRowIndex: z.number().describe('Destination start row index (0-based)'),
      destinationEndRowIndex: z.number().describe('Destination end row index (exclusive)'),
      destinationStartColumnIndex: z
        .number()
        .describe('Destination start column index (0-based)'),
      destinationEndColumnIndex: z
        .number()
        .describe('Destination end column index (exclusive)'),
      pasteType: z
        .enum([
          'PASTE_NORMAL',
          'PASTE_VALUES',
          'PASTE_FORMAT',
          'PASTE_NO_BORDERS',
          'PASTE_FORMULA',
          'PASTE_DATA_VALIDATION',
          'PASTE_CONDITIONAL_FORMATTING'
        ])
        .optional()
        .describe(
          'What to paste: NORMAL (all), VALUES (values only), FORMAT (formatting only), etc.'
        ),
      pasteOrientation: z
        .enum(['NORMAL', 'TRANSPOSE'])
        .optional()
        .describe('Whether to transpose rows and columns')
    })
  )
  .output(
    z.object({
      operationPerformed: z.string().describe('Description of the copy/paste operation'),
      sourceRange: z.string().describe('Description of the source range'),
      destinationRange: z.string().describe('Description of the destination range')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient({ token: ctx.auth.token });

    await client.copyPaste(
      ctx.input.spreadsheetId,
      {
        sheetId: ctx.input.sourceSheetId,
        startRowIndex: ctx.input.sourceStartRowIndex,
        endRowIndex: ctx.input.sourceEndRowIndex,
        startColumnIndex: ctx.input.sourceStartColumnIndex,
        endColumnIndex: ctx.input.sourceEndColumnIndex
      },
      {
        sheetId: ctx.input.destinationSheetId,
        startRowIndex: ctx.input.destinationStartRowIndex,
        endRowIndex: ctx.input.destinationEndRowIndex,
        startColumnIndex: ctx.input.destinationStartColumnIndex,
        endColumnIndex: ctx.input.destinationEndColumnIndex
      },
      ctx.input.pasteType,
      ctx.input.pasteOrientation
    );

    let sourceRows = ctx.input.sourceEndRowIndex - ctx.input.sourceStartRowIndex;
    let sourceCols = ctx.input.sourceEndColumnIndex - ctx.input.sourceStartColumnIndex;
    let destRows = ctx.input.destinationEndRowIndex - ctx.input.destinationStartRowIndex;
    let destCols = ctx.input.destinationEndColumnIndex - ctx.input.destinationStartColumnIndex;

    let output = {
      operationPerformed: `Copied and pasted (${ctx.input.pasteType || 'PASTE_NORMAL'}${ctx.input.pasteOrientation === 'TRANSPOSE' ? ', transposed' : ''})`,
      sourceRange: `${sourceRows} row(s) x ${sourceCols} column(s)`,
      destinationRange: `${destRows} row(s) x ${destCols} column(s)`
    };

    return {
      output,
      message: `Copied **${sourceRows * sourceCols}** cells and pasted to destination.`
    };
  })
  .build();
