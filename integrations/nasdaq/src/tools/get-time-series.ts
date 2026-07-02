import { SlateTool } from 'slates';
import { z } from 'zod';
import { TablesClient } from '../lib/client';
import { spec } from '../spec';

export let getTimeSeries = SlateTool.create(spec, {
  name: 'Get Time Series',
  key: 'get_time_series',
  description: `Retrieve time-series data from a Nasdaq Data Link dataset. Returns historical data points with optional date filtering, frequency collapsing, and mathematical transformations.
Use this for datasets organized as time series (e.g., stock prices, economic indicators, FX rates).
Provide the database and dataset codes (e.g., database \`WIKI\`, dataset \`AAPL\`).`,
  instructions: [
    'Provide the databaseCode and datasetCode to identify the dataset (e.g., databaseCode: "WIKI", datasetCode: "AAPL").',
    'Use startDate and endDate in YYYY-MM-DD format to filter by date range.',
    'Use collapse to change frequency (e.g., "monthly" to get monthly data from daily data).',
    'Use transform to apply mathematical transformations (e.g., "rdiff" for percentage change).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      databaseCode: z.string().describe('Database code (e.g., WIKI, FRED, EOD).'),
      datasetCode: z.string().describe('Dataset code within the database (e.g., AAPL, GDP).'),
      startDate: z.string().optional().describe('Start date filter in YYYY-MM-DD format.'),
      endDate: z.string().optional().describe('End date filter in YYYY-MM-DD format.'),
      order: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort order by date. Defaults to descending.'),
      collapse: z
        .enum(['none', 'daily', 'weekly', 'monthly', 'quarterly', 'annual'])
        .optional()
        .describe('Frequency collapse for aggregation.'),
      transform: z
        .enum(['none', 'diff', 'rdiff', 'rdiff_from', 'cumul', 'normalize'])
        .optional()
        .describe('Mathematical transformation to apply.'),
      limit: z.number().optional().describe('Maximum number of rows to return.'),
      columnIndex: z
        .number()
        .optional()
        .describe(
          'Return only a specific column by index (0-based, where 0 is the date column).'
        )
    })
  )
  .output(
    z.object({
      columnNames: z.array(z.string()).describe('Column names for the returned data.'),
      rows: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of row objects with column names as keys.'),
      rowCount: z.number().describe('Number of data points returned.'),
      startDate: z.string().describe('Start date of the returned data.'),
      endDate: z.string().describe('End date of the returned data.'),
      frequency: z.string().describe('Frequency of the data.'),
      order: z.string().describe('Sort order of the data.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TablesClient({ apiKey: ctx.auth.token });

    let response = await client.getTimeSeriesData({
      databaseCode: ctx.input.databaseCode,
      datasetCode: ctx.input.datasetCode,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      order: ctx.input.order,
      collapse: ctx.input.collapse,
      transform: ctx.input.transform,
      limit: ctx.input.limit,
      columnIndex: ctx.input.columnIndex
    });

    let columnNames = response.dataset_data.column_names;
    let rows = response.dataset_data.data.map(row => {
      let obj: Record<string, any> = {};
      columnNames.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });

    return {
      output: {
        columnNames: columnNames,
        rows: rows,
        rowCount: rows.length,
        startDate: response.dataset_data.start_date,
        endDate: response.dataset_data.end_date,
        frequency: response.dataset_data.frequency,
        order: response.dataset_data.order
      },
      message: `Retrieved **${rows.length}** data points from **${ctx.input.databaseCode}/${ctx.input.datasetCode}** (${response.dataset_data.start_date} to ${response.dataset_data.end_date}).`
    };
  })
  .build();
