import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { googleSheetsActionScopes } from '../scopes';
import { spec } from '../spec';

export let getSpreadsheet = SlateTool.create(spec, {
  name: 'Get Spreadsheet',
  key: 'get_spreadsheet',
  description: `Retrieves metadata and properties of a Google Sheets spreadsheet, including its title, locale, list of sheets/tabs, and named ranges. Use this to inspect spreadsheet structure before performing operations.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleSheetsActionScopes.getSpreadsheet)
  .input(
    z.object({
      spreadsheetId: z
        .string()
        .describe('Unique ID of the spreadsheet (found in the spreadsheet URL)')
    })
  )
  .output(
    z.object({
      spreadsheetId: z.string().describe('Unique ID of the spreadsheet'),
      spreadsheetUrl: z.string().describe('URL to open the spreadsheet'),
      title: z.string().describe('Title of the spreadsheet'),
      locale: z.string().optional().describe('Locale of the spreadsheet'),
      timeZone: z.string().optional().describe('Time zone of the spreadsheet'),
      sheets: z
        .array(
          z.object({
            sheetId: z.number().describe('Numeric ID of the sheet tab'),
            title: z.string().describe('Title of the sheet tab'),
            index: z.number().describe('Position index of the sheet tab'),
            sheetType: z.string().describe('Type of the sheet (GRID, OBJECT, etc.)'),
            rowCount: z.number().optional().describe('Number of rows'),
            columnCount: z.number().optional().describe('Number of columns'),
            frozenRowCount: z.number().optional().describe('Number of frozen rows'),
            frozenColumnCount: z.number().optional().describe('Number of frozen columns')
          })
        )
        .describe('List of sheets in the spreadsheet'),
      namedRanges: z
        .array(
          z.object({
            namedRangeId: z.string().describe('ID of the named range'),
            name: z.string().describe('Name of the named range'),
            range: z.string().describe('A1 notation of the range')
          })
        )
        .optional()
        .describe('Named ranges defined in the spreadsheet')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient(ctx.auth.token);
    let result = await client.getSpreadsheet(ctx.input.spreadsheetId);

    let sheets = (result.sheets ?? []).map((s: any) => ({
      sheetId: s.properties.sheetId,
      title: s.properties.title,
      index: s.properties.index,
      sheetType: s.properties.sheetType,
      rowCount: s.properties.gridProperties?.rowCount,
      columnCount: s.properties.gridProperties?.columnCount,
      frozenRowCount: s.properties.gridProperties?.frozenRowCount,
      frozenColumnCount: s.properties.gridProperties?.frozenColumnCount
    }));

    let namedRanges = result.namedRanges?.map((nr: any) => {
      let range = nr.range;
      let sheetTitle = sheets.find((s: any) => s.sheetId === range.sheetId)?.title ?? '';
      let a1 = sheetTitle ? `${sheetTitle}!` : '';
      if (range.startRowIndex !== undefined && range.startColumnIndex !== undefined) {
        a1 += `R${range.startRowIndex + 1}C${range.startColumnIndex + 1}`;
        if (range.endRowIndex !== undefined && range.endColumnIndex !== undefined) {
          a1 += `:R${range.endRowIndex}C${range.endColumnIndex}`;
        }
      }
      return {
        namedRangeId: nr.namedRangeId,
        name: nr.name,
        range: a1
      };
    });

    return {
      output: {
        spreadsheetId: result.spreadsheetId,
        spreadsheetUrl: result.spreadsheetUrl,
        title: result.properties.title,
        locale: result.properties.locale,
        timeZone: result.properties.timeZone,
        sheets,
        namedRanges
      },
      message: `Spreadsheet **"${result.properties.title}"** has ${sheets.length} sheet(s): ${sheets.map((s: any) => s.title).join(', ')}`
    };
  })
  .build();
