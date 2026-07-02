import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { spec } from '../spec';

export let manageSheetsTool = SlateTool.create(spec, {
  name: 'Manage Sheets',
  key: 'manage_sheets',
  description: `Manages sheets (tabs) within a Google Sheets spreadsheet.
Supports adding, deleting, duplicating, renaming, and reordering sheets.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      spreadsheetId: z.string().describe('ID of the spreadsheet'),
      operation: z
        .enum(['add', 'delete', 'duplicate', 'rename', 'move', 'hide', 'show'])
        .describe('Operation to perform'),
      sheetId: z
        .number()
        .optional()
        .describe(
          'ID of the sheet to operate on (required for delete, duplicate, rename, move, hide, show)'
        ),
      title: z.string().optional().describe('Title for new sheet (add) or new name (rename)'),
      index: z
        .number()
        .optional()
        .describe('Index position for new sheet (add, duplicate) or new position (move)'),
      rowCount: z.number().optional().describe('Initial row count for new sheet'),
      columnCount: z.number().optional().describe('Initial column count for new sheet')
    })
  )
  .output(
    z.object({
      sheetId: z.number().optional().describe('ID of the created/modified sheet'),
      title: z.string().optional().describe('Title of the sheet'),
      index: z.number().optional().describe('Index position of the sheet'),
      operationPerformed: z.string().describe('Description of the operation performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient({ token: ctx.auth.token });
    let output: {
      sheetId?: number;
      title?: string;
      index?: number;
      operationPerformed: string;
    };

    switch (ctx.input.operation) {
      case 'add': {
        let result = await client.addSheet(ctx.input.spreadsheetId, {
          title: ctx.input.title,
          index: ctx.input.index,
          gridProperties: {
            rowCount: ctx.input.rowCount,
            columnCount: ctx.input.columnCount
          }
        });
        output = {
          sheetId: result?.sheetId,
          title: result?.title,
          index: result?.index,
          operationPerformed: `Added sheet "${result?.title}"`
        };
        break;
      }

      case 'delete': {
        if (ctx.input.sheetId === undefined) {
          throw new Error('sheetId is required for delete operation');
        }
        await client.deleteSheet(ctx.input.spreadsheetId, ctx.input.sheetId);
        output = {
          sheetId: ctx.input.sheetId,
          operationPerformed: `Deleted sheet with ID ${ctx.input.sheetId}`
        };
        break;
      }

      case 'duplicate': {
        if (ctx.input.sheetId === undefined) {
          throw new Error('sheetId is required for duplicate operation');
        }
        let result = await client.duplicateSheet(ctx.input.spreadsheetId, ctx.input.sheetId, {
          newSheetName: ctx.input.title,
          insertSheetIndex: ctx.input.index
        });
        output = {
          sheetId: result?.sheetId,
          title: result?.title,
          index: result?.index,
          operationPerformed: `Duplicated sheet to "${result?.title}"`
        };
        break;
      }

      case 'rename': {
        if (ctx.input.sheetId === undefined) {
          throw new Error('sheetId is required for rename operation');
        }
        if (!ctx.input.title) {
          throw new Error('title is required for rename operation');
        }
        await client.updateSheetProperties(
          ctx.input.spreadsheetId,
          { sheetId: ctx.input.sheetId, title: ctx.input.title, index: 0 },
          'title'
        );
        output = {
          sheetId: ctx.input.sheetId,
          title: ctx.input.title,
          operationPerformed: `Renamed sheet to "${ctx.input.title}"`
        };
        break;
      }

      case 'move': {
        if (ctx.input.sheetId === undefined) {
          throw new Error('sheetId is required for move operation');
        }
        if (ctx.input.index === undefined) {
          throw new Error('index is required for move operation');
        }
        await client.updateSheetProperties(
          ctx.input.spreadsheetId,
          { sheetId: ctx.input.sheetId, index: ctx.input.index, title: '' },
          'index'
        );
        output = {
          sheetId: ctx.input.sheetId,
          index: ctx.input.index,
          operationPerformed: `Moved sheet to index ${ctx.input.index}`
        };
        break;
      }

      case 'hide': {
        if (ctx.input.sheetId === undefined) {
          throw new Error('sheetId is required for hide operation');
        }
        await client.updateSheetProperties(
          ctx.input.spreadsheetId,
          { sheetId: ctx.input.sheetId, hidden: true, index: 0, title: '' },
          'hidden'
        );
        output = {
          sheetId: ctx.input.sheetId,
          operationPerformed: `Hidden sheet with ID ${ctx.input.sheetId}`
        };
        break;
      }

      case 'show': {
        if (ctx.input.sheetId === undefined) {
          throw new Error('sheetId is required for show operation');
        }
        await client.updateSheetProperties(
          ctx.input.spreadsheetId,
          { sheetId: ctx.input.sheetId, hidden: false, index: 0, title: '' },
          'hidden'
        );
        output = {
          sheetId: ctx.input.sheetId,
          operationPerformed: `Shown sheet with ID ${ctx.input.sheetId}`
        };
        break;
      }

      default:
        throw new Error(`Unknown operation: ${ctx.input.operation}`);
    }

    return {
      output,
      message: output.operationPerformed
    };
  })
  .build();
