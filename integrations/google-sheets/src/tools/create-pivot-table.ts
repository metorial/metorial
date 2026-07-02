import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { googleSheetsActionScopes } from '../scopes';
import { spec } from '../spec';

let pivotGroupSchema = z.object({
  sourceColumnOffset: z
    .number()
    .describe('Column offset from the source range start (0-based)'),
  sortOrder: z
    .enum(['ASCENDING', 'DESCENDING'])
    .optional()
    .describe('Sort order for the group'),
  showTotals: z.boolean().optional().describe('Whether to show totals for this group')
});

let pivotValueSchema = z.object({
  sourceColumnOffset: z
    .number()
    .describe('Column offset from the source range start (0-based)'),
  summarizeFunction: z
    .enum([
      'SUM',
      'COUNTA',
      'COUNT',
      'COUNTUNIQUE',
      'AVERAGE',
      'MAX',
      'MIN',
      'MEDIAN',
      'PRODUCT',
      'STDEV',
      'STDEVP',
      'VAR',
      'VARP',
      'CUSTOM'
    ])
    .describe('Aggregation function'),
  name: z.string().optional().describe('Display name for this value column')
});

export let createPivotTable = SlateTool.create(spec, {
  name: 'Create Pivot Table',
  key: 'create_pivot_table',
  description: `Creates a pivot table that summarizes data from a source range. Configure row and column groupings, value aggregations (sum, count, average, etc.), and filters. The pivot table is placed at a specified cell location.`,
  instructions: [
    'sourceColumnOffset values are relative to the source range startColumnIndex.',
    'Updating a pivot table requires replacing the entire definition - use the Batch Update tool with an updateCells request to replace an existing pivot table.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleSheetsActionScopes.createPivotTable)
  .input(
    z.object({
      spreadsheetId: z.string().describe('Unique ID of the spreadsheet'),
      sourceSheetId: z.number().describe('Sheet ID containing the source data'),
      sourceStartRowIndex: z
        .number()
        .describe('Start row index of the source range (0-based, inclusive)'),
      sourceEndRowIndex: z
        .number()
        .describe('End row index of the source range (0-based, exclusive)'),
      sourceStartColumnIndex: z
        .number()
        .describe('Start column index of the source range (0-based, inclusive)'),
      sourceEndColumnIndex: z
        .number()
        .describe('End column index of the source range (0-based, exclusive)'),
      targetSheetId: z.number().describe('Sheet ID where the pivot table will be placed'),
      targetRowIndex: z.number().describe('Row index for the pivot table (0-based)'),
      targetColumnIndex: z.number().describe('Column index for the pivot table (0-based)'),
      rows: z.array(pivotGroupSchema).optional().describe('Row groupings for the pivot table'),
      columns: z
        .array(pivotGroupSchema)
        .optional()
        .describe('Column groupings for the pivot table'),
      values: z.array(pivotValueSchema).describe('Value aggregations for the pivot table')
    })
  )
  .output(
    z.object({
      spreadsheetId: z.string().describe('ID of the spreadsheet'),
      targetSheetId: z.number().describe('Sheet ID where the pivot table was placed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient(ctx.auth.token);
    let input = ctx.input;

    let pivotTable: Record<string, any> = {
      source: {
        sheetId: input.sourceSheetId,
        startRowIndex: input.sourceStartRowIndex,
        endRowIndex: input.sourceEndRowIndex,
        startColumnIndex: input.sourceStartColumnIndex,
        endColumnIndex: input.sourceEndColumnIndex
      },
      rows:
        input.rows?.map(r => ({
          sourceColumnOffset: r.sourceColumnOffset,
          sortOrder: r.sortOrder ?? 'ASCENDING',
          showTotals: r.showTotals ?? true
        })) ?? [],
      columns:
        input.columns?.map(c => ({
          sourceColumnOffset: c.sourceColumnOffset,
          sortOrder: c.sortOrder ?? 'ASCENDING',
          showTotals: c.showTotals ?? true
        })) ?? [],
      values: input.values.map(v => ({
        sourceColumnOffset: v.sourceColumnOffset,
        summarizeFunction: v.summarizeFunction,
        name: v.name
      }))
    };

    let request = {
      updateCells: {
        rows: [
          {
            values: [
              {
                pivotTable
              }
            ]
          }
        ],
        start: {
          sheetId: input.targetSheetId,
          rowIndex: input.targetRowIndex,
          columnIndex: input.targetColumnIndex
        },
        fields: 'pivotTable'
      }
    };

    await client.batchUpdate(input.spreadsheetId, [request]);

    return {
      output: {
        spreadsheetId: input.spreadsheetId,
        targetSheetId: input.targetSheetId
      },
      message: `Created pivot table on sheet ${input.targetSheetId} at row ${input.targetRowIndex}, column ${input.targetColumnIndex} with ${input.values.length} value aggregation(s).`
    };
  })
  .build();
