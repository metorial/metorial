import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { googleSheetsActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageSheets = SlateTool.create(spec, {
  name: 'Manage Sheets',
  key: 'manage_sheets',
  description: `Add, delete, duplicate, update, or copy individual sheet tabs. Rename a tab by using action "update" with the numeric sheetId and new title. Use "copy_to_spreadsheet" to copy a tab into another spreadsheet. Configure sheet properties like grid size, frozen rows/columns, tab color, and visibility.`,
  instructions: [
    'To add a sheet, set action to "add" and provide a title.',
    'To delete a sheet, set action to "delete" and provide the sheetId (numeric, not the title).',
    'To duplicate a sheet, set action to "duplicate" and provide the sourceSheetId.',
    'To copy a sheet into another spreadsheet, set action to "copy_to_spreadsheet" and provide sourceSheetId and destinationSpreadsheetId.',
    'To rename or update sheet properties, set action to "update" and provide the sheetId along with title or the properties to change.',
    'This tool performs one sheet-tab operation per call. For multiple raw Google Sheets API requests, use batch_update with a requests array.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleSheetsActionScopes.manageSheets)
  .input(
    z.object({
      spreadsheetId: z.string().describe('Unique ID of the spreadsheet'),
      action: z
        .enum(['add', 'delete', 'duplicate', 'update', 'copy_to_spreadsheet'])
        .describe(
          'Operation to perform on the sheet tab. Use "update" with title to rename, or "copy_to_spreadsheet" to copy a tab into another spreadsheet.'
        ),
      sheetId: z
        .number()
        .optional()
        .describe('Numeric ID of the sheet tab (required for delete and update)'),
      title: z
        .string()
        .optional()
        .describe('Title for a new sheet, or the new title when action is update'),
      sourceSheetId: z
        .number()
        .optional()
        .describe(
          'Numeric ID of the source sheet (required for duplicate and copy_to_spreadsheet)'
        ),
      destinationSpreadsheetId: z
        .string()
        .optional()
        .describe('ID of the destination spreadsheet (required for copy_to_spreadsheet)'),
      newSheetName: z.string().optional().describe('Name for the duplicated sheet'),
      insertSheetIndex: z
        .number()
        .optional()
        .describe('Position index where the new/duplicated sheet should be inserted'),
      rowCount: z
        .number()
        .optional()
        .describe('Number of rows for the sheet grid (add or update)'),
      columnCount: z
        .number()
        .optional()
        .describe('Number of columns for the sheet grid (add or update)'),
      frozenRowCount: z.number().optional().describe('Number of frozen rows (update)'),
      frozenColumnCount: z.number().optional().describe('Number of frozen columns (update)'),
      hidden: z.boolean().optional().describe('Whether the sheet should be hidden (update)'),
      tabColorRed: z.number().optional().describe('Red component of the tab color (0-1)'),
      tabColorGreen: z.number().optional().describe('Green component of the tab color (0-1)'),
      tabColorBlue: z.number().optional().describe('Blue component of the tab color (0-1)'),
      rightToLeft: z
        .boolean()
        .optional()
        .describe('Whether the sheet is right-to-left (update)')
    })
  )
  .output(
    z.object({
      sheetId: z.number().optional().describe('ID of the affected sheet'),
      title: z.string().optional().describe('Title of the affected sheet'),
      destinationSpreadsheetId: z
        .string()
        .optional()
        .describe('ID of the spreadsheet that received the copied sheet'),
      action: z.string().describe('The action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient(ctx.auth.token);
    let { action, spreadsheetId } = ctx.input;

    if (action === 'add') {
      let properties: Record<string, any> = {};
      if (ctx.input.title) properties.title = ctx.input.title;
      if (ctx.input.insertSheetIndex !== undefined)
        properties.index = ctx.input.insertSheetIndex;
      if (ctx.input.rowCount || ctx.input.columnCount) {
        properties.gridProperties = {};
        if (ctx.input.rowCount) properties.gridProperties.rowCount = ctx.input.rowCount;
        if (ctx.input.columnCount)
          properties.gridProperties.columnCount = ctx.input.columnCount;
      }
      if (
        ctx.input.tabColorRed !== undefined ||
        ctx.input.tabColorGreen !== undefined ||
        ctx.input.tabColorBlue !== undefined
      ) {
        properties.tabColorStyle = {
          rgbColor: {
            red: ctx.input.tabColorRed ?? 0,
            green: ctx.input.tabColorGreen ?? 0,
            blue: ctx.input.tabColorBlue ?? 0
          }
        };
      }

      let result = await client.addSheet(spreadsheetId, properties);
      let reply = result.replies?.[0]?.addSheet?.properties;

      return {
        output: {
          sheetId: reply?.sheetId,
          title: reply?.title ?? ctx.input.title,
          action: 'add'
        },
        message: `Added sheet **"${reply?.title ?? ctx.input.title}"** (ID: ${reply?.sheetId}).`
      };
    }

    if (action === 'delete') {
      if (ctx.input.sheetId === undefined)
        throw createApiServiceError('sheetId is required for delete');
      await client.deleteSheet(spreadsheetId, ctx.input.sheetId);
      return {
        output: {
          sheetId: ctx.input.sheetId,
          action: 'delete'
        },
        message: `Deleted sheet with ID ${ctx.input.sheetId}.`
      };
    }

    if (action === 'duplicate') {
      if (ctx.input.sourceSheetId === undefined)
        throw createApiServiceError('sourceSheetId is required for duplicate');
      let result = await client.duplicateSheet(
        spreadsheetId,
        ctx.input.sourceSheetId,
        ctx.input.newSheetName,
        ctx.input.insertSheetIndex
      );
      let reply = result.replies?.[0]?.duplicateSheet?.properties;

      return {
        output: {
          sheetId: reply?.sheetId,
          title: reply?.title ?? ctx.input.newSheetName,
          action: 'duplicate'
        },
        message: `Duplicated sheet to **"${reply?.title ?? ctx.input.newSheetName}"** (ID: ${reply?.sheetId}).`
      };
    }

    if (action === 'copy_to_spreadsheet') {
      if (ctx.input.sourceSheetId === undefined)
        throw createApiServiceError('sourceSheetId is required for copy_to_spreadsheet');
      if (!ctx.input.destinationSpreadsheetId)
        throw createApiServiceError(
          'destinationSpreadsheetId is required for copy_to_spreadsheet'
        );

      let result = await client.copySheetToSpreadsheet(
        spreadsheetId,
        ctx.input.sourceSheetId,
        ctx.input.destinationSpreadsheetId
      );

      return {
        output: {
          sheetId: result.sheetId,
          title: result.title,
          destinationSpreadsheetId: ctx.input.destinationSpreadsheetId,
          action: 'copy_to_spreadsheet'
        },
        message: `Copied sheet ${ctx.input.sourceSheetId} to spreadsheet **${ctx.input.destinationSpreadsheetId}** as **"${result.title}"** (ID: ${result.sheetId}).`
      };
    }

    if (action === 'update') {
      if (ctx.input.sheetId === undefined)
        throw createApiServiceError('sheetId is required for update');

      let properties: Record<string, any> = { sheetId: ctx.input.sheetId };
      let fields: string[] = [];

      if (ctx.input.title !== undefined) {
        properties.title = ctx.input.title;
        fields.push('title');
      }
      if (ctx.input.hidden !== undefined) {
        properties.hidden = ctx.input.hidden;
        fields.push('hidden');
      }
      if (ctx.input.rightToLeft !== undefined) {
        properties.rightToLeft = ctx.input.rightToLeft;
        fields.push('rightToLeft');
      }
      if (ctx.input.insertSheetIndex !== undefined) {
        properties.index = ctx.input.insertSheetIndex;
        fields.push('index');
      }
      if (
        ctx.input.tabColorRed !== undefined ||
        ctx.input.tabColorGreen !== undefined ||
        ctx.input.tabColorBlue !== undefined
      ) {
        properties.tabColorStyle = {
          rgbColor: {
            red: ctx.input.tabColorRed ?? 0,
            green: ctx.input.tabColorGreen ?? 0,
            blue: ctx.input.tabColorBlue ?? 0
          }
        };
        fields.push('tabColorStyle');
      }

      let gridFields: string[] = [];
      if (ctx.input.frozenRowCount !== undefined) {
        properties.gridProperties = properties.gridProperties ?? {};
        properties.gridProperties.frozenRowCount = ctx.input.frozenRowCount;
        gridFields.push('gridProperties.frozenRowCount');
      }
      if (ctx.input.frozenColumnCount !== undefined) {
        properties.gridProperties = properties.gridProperties ?? {};
        properties.gridProperties.frozenColumnCount = ctx.input.frozenColumnCount;
        gridFields.push('gridProperties.frozenColumnCount');
      }
      if (ctx.input.rowCount !== undefined) {
        properties.gridProperties = properties.gridProperties ?? {};
        properties.gridProperties.rowCount = ctx.input.rowCount;
        gridFields.push('gridProperties.rowCount');
      }
      if (ctx.input.columnCount !== undefined) {
        properties.gridProperties = properties.gridProperties ?? {};
        properties.gridProperties.columnCount = ctx.input.columnCount;
        gridFields.push('gridProperties.columnCount');
      }

      let allFields = [...fields, ...gridFields];
      if (allFields.length === 0)
        throw createApiServiceError('At least one property must be provided to update');

      await client.updateSheetProperties(spreadsheetId, properties, allFields.join(','));

      return {
        output: {
          sheetId: ctx.input.sheetId,
          title: ctx.input.title,
          action: 'update'
        },
        message: `Updated sheet ${ctx.input.sheetId} properties: ${allFields.join(', ')}.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
