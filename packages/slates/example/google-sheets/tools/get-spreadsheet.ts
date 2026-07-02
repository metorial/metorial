import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { spec } from '../spec';

export let getSpreadsheetTool = SlateTool.create(spec, {
  name: 'Get Spreadsheet',
  key: 'get_spreadsheet',
  description: `Retrieves metadata and structure of a Google Sheets spreadsheet.
Returns spreadsheet properties, sheet list, and named ranges. Optionally include cell data for specific ranges.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      spreadsheetId: z.string().describe('ID of the spreadsheet to retrieve'),
      ranges: z
        .array(z.string())
        .optional()
        .describe('Optional ranges to include grid data for (e.g., ["Sheet1!A1:B10"])'),
      includeGridData: z
        .boolean()
        .optional()
        .describe('Include cell data for specified ranges')
    })
  )
  .output(
    z.object({
      spreadsheetId: z.string().describe('ID of the spreadsheet'),
      title: z.string().describe('Title of the spreadsheet'),
      locale: z.string().optional().describe('Locale of the spreadsheet'),
      timeZone: z.string().optional().describe('Time zone of the spreadsheet'),
      spreadsheetUrl: z.string().optional().describe('URL to open the spreadsheet'),
      sheets: z
        .array(
          z.object({
            sheetId: z.number().describe('ID of the sheet'),
            title: z.string().describe('Title of the sheet'),
            index: z.number().describe('Index position of the sheet'),
            sheetType: z.string().optional().describe('Type of the sheet'),
            rowCount: z.number().optional().describe('Number of rows'),
            columnCount: z.number().optional().describe('Number of columns'),
            frozenRowCount: z.number().optional().describe('Number of frozen rows'),
            frozenColumnCount: z.number().optional().describe('Number of frozen columns'),
            hidden: z.boolean().optional().describe('Whether the sheet is hidden')
          })
        )
        .describe('Sheets in the spreadsheet'),
      namedRanges: z
        .array(
          z.object({
            namedRangeId: z.string().optional().describe('ID of the named range'),
            name: z.string().optional().describe('Name of the range'),
            sheetId: z.number().optional().describe('Sheet containing the range'),
            startRowIndex: z.number().optional().describe('Start row (0-indexed)'),
            endRowIndex: z.number().optional().describe('End row (exclusive)'),
            startColumnIndex: z.number().optional().describe('Start column (0-indexed)'),
            endColumnIndex: z.number().optional().describe('End column (exclusive)')
          })
        )
        .optional()
        .describe('Named ranges in the spreadsheet')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient({ token: ctx.auth.token });

    let result = await client.getSpreadsheet(ctx.input.spreadsheetId, {
      ranges: ctx.input.ranges,
      includeGridData: ctx.input.includeGridData
    });

    let output = {
      spreadsheetId: result.spreadsheetId,
      title: result.properties.title,
      locale: result.properties.locale,
      timeZone: result.properties.timeZone,
      spreadsheetUrl: result.spreadsheetUrl,
      sheets: (result.sheets || []).map(sheet => ({
        sheetId: sheet.properties.sheetId,
        title: sheet.properties.title,
        index: sheet.properties.index,
        sheetType: sheet.properties.sheetType,
        rowCount: sheet.properties.gridProperties?.rowCount,
        columnCount: sheet.properties.gridProperties?.columnCount,
        frozenRowCount: sheet.properties.gridProperties?.frozenRowCount,
        frozenColumnCount: sheet.properties.gridProperties?.frozenColumnCount,
        hidden: sheet.properties.hidden
      })),
      namedRanges: result.namedRanges?.map(nr => ({
        namedRangeId: nr.namedRangeId,
        name: nr.name,
        sheetId: nr.range?.sheetId,
        startRowIndex: nr.range?.startRowIndex,
        endRowIndex: nr.range?.endRowIndex,
        startColumnIndex: nr.range?.startColumnIndex,
        endColumnIndex: nr.range?.endColumnIndex
      }))
    };

    return {
      output,
      message: `Retrieved spreadsheet **"${output.title}"** with ${output.sheets.length} sheet(s).`
    };
  })
  .build();
