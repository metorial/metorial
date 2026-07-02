import { SlateTool } from 'slates';
import { z } from 'zod';
import { TablesClient } from '../lib/client';
import { spec } from '../spec';

export let queryTable = SlateTool.create(spec, {
  name: 'Query Table',
  key: 'query_table',
  description: `Query data from a Nasdaq Data Link table (datatable). Returns structured rows with column metadata and supports cursor-based pagination for large result sets.
Use this to retrieve historical data, reference data, equity prices, fundamentals, options data, and more from any available Nasdaq Data Link table.
Provide the table path in the format \`PUBLISHER/TABLE_CODE\` (e.g., \`ZACKS/FC\`, \`SHARADAR/SF1\`, \`QDL/EOD\`).`,
  instructions: [
    'Use the tablePath in the format PUBLISHER/TABLE_CODE (e.g., ZACKS/FC for Zacks Fundamentals).',
    'Use the filters parameter to filter rows by column values. Keys can include comparison suffixes like .gt, .lt, .gte, .lte (e.g., {"date.gte": "2023-01-01", "ticker": "AAPL"}).',
    'If the response includes a nextCursorId, pass it as cursorId in a subsequent request to get the next page of results.'
  ],
  constraints: [
    'Maximum 10,000 rows per request. Use cursor-based pagination for larger datasets.',
    'Premium tables require an active subscription.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tablePath: z
        .string()
        .describe(
          'Table path in the format PUBLISHER/TABLE_CODE (e.g., ZACKS/FC, SHARADAR/SF1).'
        ),
      filters: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Row-level filters as key-value pairs. Keys are column names, optionally with .gt, .lt, .gte, .lte suffixes (e.g., {"ticker": "AAPL", "date.gte": "2023-01-01"}).'
        ),
      columns: z
        .array(z.string())
        .optional()
        .describe(
          'List of specific column names to return. If omitted, all columns are returned.'
        ),
      perPage: z.number().optional().describe('Number of rows per page (max 10,000).'),
      cursorId: z
        .string()
        .optional()
        .describe(
          "Cursor ID for pagination, obtained from a previous response's nextCursorId."
        )
    })
  )
  .output(
    z.object({
      columns: z
        .array(
          z.object({
            name: z.string(),
            type: z.string()
          })
        )
        .describe('Column definitions for the returned data.'),
      rows: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of row objects with column names as keys.'),
      rowCount: z.number().describe('Number of rows returned in this response.'),
      nextCursorId: z
        .string()
        .nullable()
        .describe('Cursor ID for fetching the next page. Null if no more data.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TablesClient({ apiKey: ctx.auth.token });

    let response = await client.queryTable({
      tablePath: ctx.input.tablePath,
      filters: ctx.input.filters as Record<string, string> | undefined,
      columns: ctx.input.columns,
      perPage: ctx.input.perPage,
      cursorId: ctx.input.cursorId
    });

    let columns = response.datatable.columns;
    let rows = response.datatable.data.map(row => {
      let obj: Record<string, any> = {};
      columns.forEach((col, i) => {
        obj[col.name] = row[i];
      });
      return obj;
    });

    return {
      output: {
        columns: columns,
        rows: rows,
        rowCount: rows.length,
        nextCursorId: response.meta.next_cursor_id
      },
      message: `Retrieved **${rows.length}** rows from table **${ctx.input.tablePath}**.${response.meta.next_cursor_id ? ' More data available via pagination.' : ' All data retrieved.'}`
    };
  })
  .build();
