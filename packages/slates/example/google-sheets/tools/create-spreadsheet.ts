import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { spec } from '../spec';

export let createSpreadsheetTool = SlateTool.create(spec, {
  name: 'Create Spreadsheet',
  key: 'create_spreadsheet',
  description: `Creates a new Google Sheets spreadsheet with optional initial sheets.
Use this to programmatically create spreadsheets with custom titles, locales, and time zones.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title of the new spreadsheet'),
      locale: z.string().optional().describe('Locale of the spreadsheet (e.g., "en_US")'),
      timeZone: z
        .string()
        .optional()
        .describe('Time zone of the spreadsheet (e.g., "America/New_York")'),
      autoRecalc: z
        .enum(['ON_CHANGE', 'MINUTE', 'HOUR'])
        .optional()
        .describe('When to recalculate formulas')
    })
  )
  .output(
    z.object({
      spreadsheetId: z.string().describe('ID of the created spreadsheet'),
      title: z.string().describe('Title of the spreadsheet'),
      spreadsheetUrl: z.string().optional().describe('URL to open the spreadsheet'),
      sheets: z
        .array(
          z.object({
            sheetId: z.number().describe('ID of the sheet'),
            title: z.string().describe('Title of the sheet'),
            index: z.number().describe('Index position of the sheet')
          })
        )
        .describe('Sheets in the spreadsheet')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient({ token: ctx.auth.token });

    let result = await client.createSpreadsheet({
      title: ctx.input.title,
      locale: ctx.input.locale,
      timeZone: ctx.input.timeZone,
      autoRecalc: ctx.input.autoRecalc
    });

    let output = {
      spreadsheetId: result.spreadsheetId,
      title: result.properties.title,
      spreadsheetUrl: result.spreadsheetUrl,
      sheets: (result.sheets || []).map(sheet => ({
        sheetId: sheet.properties.sheetId,
        title: sheet.properties.title,
        index: sheet.properties.index
      }))
    };

    return {
      output,
      message: `Created spreadsheet **"${output.title}"** with ID \`${output.spreadsheetId}\`.`
    };
  })
  .build();
