import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { spec } from '../spec';

export let manageRowsColumnsTool = SlateTool.create(spec, {
  name: 'Manage Rows and Columns',
  key: 'manage_rows_columns',
  description: `Insert, delete, or resize rows and columns in a Google Sheets spreadsheet.
Supports bulk operations and auto-resizing to fit content.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      spreadsheetId: z.string().describe('ID of the spreadsheet'),
      sheetId: z.number().describe('ID of the sheet'),
      dimension: z.enum(['ROWS', 'COLUMNS']).describe('Whether to operate on rows or columns'),
      operation: z
        .enum(['insert', 'delete', 'append', 'autoResize'])
        .describe('Operation to perform'),
      startIndex: z
        .number()
        .optional()
        .describe('Start index (0-based) for insert/delete operations'),
      endIndex: z
        .number()
        .optional()
        .describe('End index (exclusive) for insert/delete operations'),
      count: z.number().optional().describe('Number of rows/columns to append'),
      inheritFromBefore: z
        .boolean()
        .optional()
        .describe('Inherit formatting from row/column before (insert only)')
    })
  )
  .output(
    z.object({
      operationPerformed: z.string().describe('Description of the operation performed'),
      affectedRange: z
        .object({
          dimension: z.enum(['ROWS', 'COLUMNS']).describe('Dimension affected'),
          startIndex: z.number().optional().describe('Start index'),
          endIndex: z.number().optional().describe('End index'),
          count: z.number().optional().describe('Count affected')
        })
        .describe('Range that was affected')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient({ token: ctx.auth.token });

    switch (ctx.input.operation) {
      case 'insert': {
        if (ctx.input.startIndex === undefined || ctx.input.endIndex === undefined) {
          throw new Error('startIndex and endIndex are required for insert operation');
        }
        await client.insertDimension(
          ctx.input.spreadsheetId,
          ctx.input.sheetId,
          ctx.input.dimension,
          ctx.input.startIndex,
          ctx.input.endIndex,
          ctx.input.inheritFromBefore
        );
        let count = ctx.input.endIndex - ctx.input.startIndex;
        return {
          output: {
            operationPerformed: `Inserted ${count} ${ctx.input.dimension.toLowerCase()} at index ${ctx.input.startIndex}`,
            affectedRange: {
              dimension: ctx.input.dimension,
              startIndex: ctx.input.startIndex,
              endIndex: ctx.input.endIndex,
              count
            }
          },
          message: `Inserted **${count}** ${ctx.input.dimension.toLowerCase()} starting at index ${ctx.input.startIndex}.`
        };
      }

      case 'delete': {
        if (ctx.input.startIndex === undefined || ctx.input.endIndex === undefined) {
          throw new Error('startIndex and endIndex are required for delete operation');
        }
        await client.deleteDimension(
          ctx.input.spreadsheetId,
          ctx.input.sheetId,
          ctx.input.dimension,
          ctx.input.startIndex,
          ctx.input.endIndex
        );
        let count = ctx.input.endIndex - ctx.input.startIndex;
        return {
          output: {
            operationPerformed: `Deleted ${count} ${ctx.input.dimension.toLowerCase()} from index ${ctx.input.startIndex}`,
            affectedRange: {
              dimension: ctx.input.dimension,
              startIndex: ctx.input.startIndex,
              endIndex: ctx.input.endIndex,
              count
            }
          },
          message: `Deleted **${count}** ${ctx.input.dimension.toLowerCase()} starting at index ${ctx.input.startIndex}.`
        };
      }

      case 'append': {
        if (ctx.input.count === undefined) {
          throw new Error('count is required for append operation');
        }
        await client.appendDimension(
          ctx.input.spreadsheetId,
          ctx.input.sheetId,
          ctx.input.dimension,
          ctx.input.count
        );
        return {
          output: {
            operationPerformed: `Appended ${ctx.input.count} ${ctx.input.dimension.toLowerCase()}`,
            affectedRange: {
              dimension: ctx.input.dimension,
              count: ctx.input.count
            }
          },
          message: `Appended **${ctx.input.count}** ${ctx.input.dimension.toLowerCase()} to the sheet.`
        };
      }

      case 'autoResize': {
        await client.autoResizeDimensions(
          ctx.input.spreadsheetId,
          ctx.input.sheetId,
          ctx.input.dimension,
          ctx.input.startIndex,
          ctx.input.endIndex
        );
        let rangeDesc =
          ctx.input.startIndex !== undefined && ctx.input.endIndex !== undefined
            ? `from index ${ctx.input.startIndex} to ${ctx.input.endIndex}`
            : 'all';
        return {
          output: {
            operationPerformed: `Auto-resized ${ctx.input.dimension.toLowerCase()} ${rangeDesc}`,
            affectedRange: {
              dimension: ctx.input.dimension,
              startIndex: ctx.input.startIndex,
              endIndex: ctx.input.endIndex
            }
          },
          message: `Auto-resized ${ctx.input.dimension.toLowerCase()} to fit content.`
        };
      }

      default:
        throw new Error(`Unknown operation: ${ctx.input.operation}`);
    }
  })
  .build();
