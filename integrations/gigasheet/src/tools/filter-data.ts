import { SlateTool } from 'slates';
import { z } from 'zod';
import { GigasheetClient } from '../lib/client';
import { spec } from '../spec';

export let filterData = SlateTool.create(spec, {
  name: 'Filter Data',
  key: 'filter_data',
  description: `Query and filter data in a Gigasheet sheet. Supports filtering with complex filter models (AND/OR conditions, regex, wildcards), sorting, pagination, grouping, and aggregations. You can also use a saved filter by its handle.`,
  instructions: [
    "The filterModel follows Gigasheet's filter format with nested AND/OR conditions.",
    'Use startRow and endRow for pagination (0-based indexing).',
    "To use a saved filter, provide the savedFilterHandle and the sheet handle. The saved filter's model will be applied automatically."
  ]
})
  .input(
    z.object({
      sheetHandle: z.string().describe('Handle of the sheet to filter'),
      filterModel: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Filter model object defining filter conditions'),
      savedFilterHandle: z
        .string()
        .optional()
        .describe('Handle of a saved filter to apply instead of a raw filterModel'),
      sortModel: z
        .array(
          z.object({
            colId: z.string().describe('Column ID to sort by'),
            sort: z.enum(['asc', 'desc']).describe('Sort direction')
          })
        )
        .optional()
        .describe('Sort configuration'),
      startRow: z
        .number()
        .optional()
        .default(0)
        .describe('Starting row index for pagination (0-based)'),
      endRow: z
        .number()
        .optional()
        .default(100)
        .describe('Ending row index for pagination (exclusive)'),
      groupColumns: z.array(z.string()).optional().describe('Columns to group by'),
      aggregations: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Aggregation settings per column')
    })
  )
  .output(
    z.object({
      rows: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Filtered row data'),
      totalRows: z.number().optional().describe('Total number of matching rows'),
      rawResponse: z.record(z.string(), z.unknown()).describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GigasheetClient({ token: ctx.auth.token });

    let filterModel = ctx.input.filterModel;

    if (ctx.input.savedFilterHandle) {
      let savedFilter = await client.getFilterModelForSheet(
        ctx.input.savedFilterHandle,
        ctx.input.sheetHandle
      );
      filterModel = savedFilter;
    }

    let result = await client.filterData(ctx.input.sheetHandle, {
      filterModel,
      sortModel: ctx.input.sortModel,
      startRow: ctx.input.startRow,
      endRow: ctx.input.endRow,
      groupColumns: ctx.input.groupColumns,
      aggregations: ctx.input.aggregations
    });

    let rows = Array.isArray(result?.rows)
      ? (result.rows as Record<string, unknown>[])
      : undefined;
    let totalRows =
      typeof result?.totalRows === 'number' ? (result.totalRows as number) : undefined;

    return {
      output: {
        rows,
        totalRows,
        rawResponse: result
      },
      message: `Filtered data from sheet. ${rows ? `Returned **${rows.length}** rows` : 'Results returned'}${totalRows !== undefined ? ` out of **${totalRows}** total` : ''}.`
    };
  })
  .build();
