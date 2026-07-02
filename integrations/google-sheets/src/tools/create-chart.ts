import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { googleSheetsActionScopes } from '../scopes';
import { spec } from '../spec';

let sourceRangeSchema = z.object({
  sheetId: z.number().describe('Sheet ID containing the data'),
  startRowIndex: z.number().describe('Start row index (0-based, inclusive)'),
  endRowIndex: z.number().describe('End row index (0-based, exclusive)'),
  startColumnIndex: z.number().describe('Start column index (0-based, inclusive)'),
  endColumnIndex: z.number().describe('End column index (0-based, exclusive)')
});

export let createChart = SlateTool.create(spec, {
  name: 'Create Chart',
  key: 'create_chart',
  description: `Creates an embedded chart in a spreadsheet. Supports bar, line, pie, area, scatter, and column chart types. Configure the data source range, chart position, title, and axis labels.`,
  instructions: [
    'Provide the data source range using sheetId and 0-based row/column indices.',
    'The chart is anchored to a cell position on a sheet using anchorCell.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleSheetsActionScopes.createChart)
  .input(
    z.object({
      spreadsheetId: z.string().describe('Unique ID of the spreadsheet'),
      chartType: z
        .enum(['BAR', 'LINE', 'PIE', 'AREA', 'SCATTER', 'COLUMN'])
        .describe('Type of chart to create'),
      title: z.string().optional().describe('Title displayed on the chart'),
      sourceRange: sourceRangeSchema.describe('Data source range for the chart'),
      anchorSheetId: z.number().describe('Sheet ID where the chart will be placed'),
      anchorRowIndex: z
        .number()
        .optional()
        .describe('Row index to anchor the chart (0-based). Defaults to 0.'),
      anchorColumnIndex: z
        .number()
        .optional()
        .describe('Column index to anchor the chart (0-based). Defaults to 0.'),
      legendPosition: z
        .enum(['BOTTOM_LEGEND', 'LEFT_LEGEND', 'RIGHT_LEGEND', 'TOP_LEGEND', 'NO_LEGEND'])
        .optional()
        .describe('Position of the chart legend')
    })
  )
  .output(
    z.object({
      chartId: z.number().optional().describe('ID of the created chart'),
      spreadsheetId: z.string().describe('ID of the spreadsheet')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient(ctx.auth.token);
    let input = ctx.input;
    let columnSpan = input.sourceRange.endColumnIndex - input.sourceRange.startColumnIndex;

    if (columnSpan < 2) {
      throw new Error(
        'sourceRange must include at least two columns: one domain column and one series column.'
      );
    }

    let domainRange = {
      sheetId: input.sourceRange.sheetId,
      startRowIndex: input.sourceRange.startRowIndex,
      endRowIndex: input.sourceRange.endRowIndex,
      startColumnIndex: input.sourceRange.startColumnIndex,
      endColumnIndex: input.sourceRange.startColumnIndex + 1
    };

    let seriesRanges = Array.from({ length: columnSpan - 1 }, (_, index) => ({
      sheetId: input.sourceRange.sheetId,
      startRowIndex: input.sourceRange.startRowIndex,
      endRowIndex: input.sourceRange.endRowIndex,
      startColumnIndex: input.sourceRange.startColumnIndex + index + 1,
      endColumnIndex: input.sourceRange.startColumnIndex + index + 2
    }));

    let chartSpec: Record<string, any> = {
      title: input.title
    };

    if (input.chartType === 'PIE') {
      if (seriesRanges.length !== 1) {
        throw new Error(
          'PIE charts require exactly two columns in sourceRange: one domain column and one value column.'
        );
      }

      chartSpec.pieChart = {
        legendPosition: input.legendPosition ?? 'BOTTOM_LEGEND',
        domain: {
          sourceRange: { sources: [domainRange] }
        },
        series: {
          sourceRange: { sources: [seriesRanges[0]] }
        }
      };
    } else {
      let basicChartType = input.chartType === 'COLUMN' ? 'COLUMN' : input.chartType;
      chartSpec.basicChart = {
        chartType: basicChartType,
        legendPosition: input.legendPosition ?? 'BOTTOM_LEGEND',
        domains: [
          {
            domain: {
              sourceRange: { sources: [domainRange] }
            }
          }
        ],
        series: seriesRanges.map(range => ({
          series: {
            sourceRange: {
              sources: [range]
            }
          },
          targetAxis: 'LEFT_AXIS'
        }))
      };
    }

    let request = {
      addChart: {
        chart: {
          spec: chartSpec,
          position: {
            overlayPosition: {
              anchorCell: {
                sheetId: input.anchorSheetId,
                rowIndex: input.anchorRowIndex ?? 0,
                columnIndex: input.anchorColumnIndex ?? 0
              }
            }
          }
        }
      }
    };

    let result = await client.batchUpdate(input.spreadsheetId, [request]);
    let chartId = result.replies?.[0]?.addChart?.chart?.chartId;

    return {
      output: {
        chartId,
        spreadsheetId: input.spreadsheetId
      },
      message: `Created ${input.chartType.toLowerCase()} chart${input.title ? ` **"${input.title}"**` : ''} (ID: ${chartId}).`
    };
  })
  .build();
