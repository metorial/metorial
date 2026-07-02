import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { googleSheetsActionScopes } from '../scopes';
import { spec } from '../spec';

export let updateSpreadsheet = SlateTool.create(spec, {
  name: 'Update Spreadsheet',
  key: 'update_spreadsheet',
  description: `Updates the properties of a Google Sheets spreadsheet, such as its title, locale, or time zone.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleSheetsActionScopes.updateSpreadsheet)
  .input(
    z.object({
      spreadsheetId: z.string().describe('Unique ID of the spreadsheet to update'),
      title: z.string().optional().describe('New title for the spreadsheet'),
      locale: z.string().optional().describe('New locale (e.g., "en_US")'),
      timeZone: z.string().optional().describe('New time zone (e.g., "America/New_York")')
    })
  )
  .output(
    z.object({
      spreadsheetId: z.string().describe('ID of the updated spreadsheet'),
      updatedFields: z.array(z.string()).describe('List of fields that were updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient(ctx.auth.token);

    let properties: Record<string, any> = {};
    let fields: string[] = [];

    if (ctx.input.title !== undefined) {
      properties.title = ctx.input.title;
      fields.push('title');
    }
    if (ctx.input.locale !== undefined) {
      properties.locale = ctx.input.locale;
      fields.push('locale');
    }
    if (ctx.input.timeZone !== undefined) {
      properties.timeZone = ctx.input.timeZone;
      fields.push('timeZone');
    }

    if (fields.length === 0) {
      throw new Error('At least one property must be provided to update');
    }

    await client.updateSpreadsheetProperties(
      ctx.input.spreadsheetId,
      properties,
      fields.join(',')
    );

    return {
      output: {
        spreadsheetId: ctx.input.spreadsheetId,
        updatedFields: fields
      },
      message: `Updated spreadsheet properties: ${fields.join(', ')}`
    };
  })
  .build();
