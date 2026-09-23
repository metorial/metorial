import { buildApiServiceError, createApiServiceError, SlateTrigger } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { googleSheetsActionScopes } from '../scopes';
import { spec } from '../spec';
import { spreadsheetChangeEventSchema } from './event-schemas';
import { spreadsheetEvents } from './spreadsheet-events-trigger-group';

export let spreadsheetChanged = SlateTrigger.create(spec, {
  name: 'Spreadsheet Changed',
  key: 'spreadsheet_changed',
  description:
    'Triggers when a Google Sheets file accessible to this connection was modified recently. Checks Google Drive every 15 minutes.'
})
  .triggerGroup(spreadsheetEvents)
  .scopes(googleSheetsActionScopes.spreadsheetChanged)
  .input(spreadsheetChangeEventSchema)
  .output(
    z.object({
      spreadsheetId: z.string().describe('ID of the changed spreadsheet'),
      spreadsheetUrl: z.string().describe('URL of the spreadsheet'),
      title: z.string().describe('Current title of the spreadsheet'),
      modifiedTime: z.string().optional().describe('Last modified time of the file'),
      lastModifyingUserEmail: z
        .string()
        .optional()
        .describe('Email of the user who last modified the file'),
      lastModifyingUserName: z
        .string()
        .optional()
        .describe('Display name of the user who last modified the file'),
      sheetTitles: z.array(z.string()).describe('List of sheet tab titles in the spreadsheet')
    })
  )
  .matches(
    payload =>
      payload !== null &&
      typeof payload === 'object' &&
      !Array.isArray(payload) &&
      spreadsheetChangeEventSchema.safeParse(payload).success
  )
  .map(async ctx => {
    const { spreadsheetId, modifiedTime } = ctx.input;
    const sheets = new SheetsClient(ctx.auth.token);
    let spreadsheet: Awaited<ReturnType<SheetsClient['getSpreadsheet']>>;
    try {
      spreadsheet = await sheets.getSpreadsheet(spreadsheetId);
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Google Sheets',
        reason: 'google_sheets_spreadsheet_metadata_failed',
        operation: 'get changed spreadsheet'
      });
    }
    if (
      typeof spreadsheet?.spreadsheetUrl !== 'string' ||
      typeof spreadsheet?.properties?.title !== 'string' ||
      !Array.isArray(spreadsheet.sheets) ||
      spreadsheet.sheets.some(
        (sheet: { properties?: { title?: string } }) =>
          typeof sheet?.properties?.title !== 'string'
      )
    ) {
      throw createApiServiceError('Google Sheets returned incomplete spreadsheet metadata.');
    }

    return {
      type: 'spreadsheet.update',
      id: `${spreadsheetId}:${modifiedTime}`,
      output: {
        spreadsheetId,
        spreadsheetUrl: spreadsheet.spreadsheetUrl,
        title: spreadsheet.properties.title,
        modifiedTime,
        lastModifyingUserEmail: ctx.input.lastModifyingUserEmail,
        lastModifyingUserName: ctx.input.lastModifyingUserName,
        sheetTitles: spreadsheet.sheets.map(
          (sheet: { properties: { title: string } }) => sheet.properties.title
        )
      }
    };
  })
  .build();
