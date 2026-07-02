import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { googleSheetsActionScopes } from '../scopes';
import { spec } from '../spec';

export let createSpreadsheet = SlateTool.create(spec, {
  name: 'Create Spreadsheet',
  key: 'create_spreadsheet',
  description: `Creates a new Google Sheets spreadsheet with optional initial sheet tabs. Returns the spreadsheet ID and URL for immediate use.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleSheetsActionScopes.createSpreadsheet)
  .input(
    z.object({
      title: z.string().describe('Title of the new spreadsheet'),
      locale: z.string().optional().describe('Locale of the spreadsheet (e.g., "en_US")'),
      sheetTitles: z
        .array(z.string())
        .optional()
        .describe(
          'Names of initial sheets/tabs to create. If not provided, a default "Sheet1" tab is created.'
        )
    })
  )
  .output(
    z.object({
      spreadsheetId: z.string().describe('Unique ID of the created spreadsheet'),
      spreadsheetUrl: z.string().describe('URL to open the spreadsheet in a browser'),
      title: z.string().describe('Title of the created spreadsheet'),
      sheets: z
        .array(
          z.object({
            sheetId: z.number().describe('Numeric ID of the sheet tab'),
            title: z.string().describe('Title of the sheet tab'),
            index: z.number().describe('Position of the sheet tab')
          })
        )
        .describe('List of sheet tabs in the spreadsheet')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient(ctx.auth.token);

    let result = await client.createSpreadsheet({
      title: ctx.input.title,
      locale: ctx.input.locale,
      sheetTitles: ctx.input.sheetTitles
    });

    let sheets = (result.sheets ?? []).map((s: any) => ({
      sheetId: s.properties.sheetId,
      title: s.properties.title,
      index: s.properties.index
    }));

    return {
      output: {
        spreadsheetId: result.spreadsheetId,
        spreadsheetUrl: result.spreadsheetUrl,
        title: result.properties.title,
        sheets
      },
      message: `Created spreadsheet **"${result.properties.title}"** with ${sheets.length} sheet(s). [Open spreadsheet](${result.spreadsheetUrl})`
    };
  })
  .build();
