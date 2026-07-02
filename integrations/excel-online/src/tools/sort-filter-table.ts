import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExcelClient } from '../lib/client';
import { spec } from '../spec';

export let sortFilterTable = SlateTool.create(spec, {
  name: 'Sort & Filter Table',
  key: 'sort_filter_table',
  description: `Apply sorting or filtering to a structured Excel table. Sort by one or more columns, apply filter criteria to a specific column, or clear existing sorts and filters.`,
  instructions: [
    'For sorting, provide one or more sort fields with column index and direction.',
    'For filtering, specify the column index and a filter criteria object.',
    'Filter criteria supports properties like "filterOn" (e.g., "Values", "TopItems", "Custom"), "values" (array of filter values), "operator" (e.g., "And", "Or"), "criterion1", "criterion2".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      workbookItemId: z.string().describe('The Drive item ID of the Excel workbook file'),
      tableIdOrName: z.string().describe('Table ID or name'),
      action: z
        .enum(['sort', 'clearSort', 'filter', 'clearFilters'])
        .describe('Operation to perform'),
      sortFields: z
        .array(
          z.object({
            key: z.number().describe('Zero-based column index to sort by'),
            ascending: z.boolean().optional().describe('Sort ascending (default: true)')
          })
        )
        .optional()
        .describe('Sort fields (for sort action)'),
      filterColumnIndex: z
        .number()
        .optional()
        .describe('Zero-based column index to filter (for filter action)'),
      filterCriteria: z
        .object({
          filterOn: z
            .string()
            .optional()
            .describe('Filter type: "Values", "TopItems", "TopPercent", "Custom", etc.'),
          values: z
            .array(z.string())
            .optional()
            .describe('Values to filter by (for Values filterOn)'),
          criterion1: z.string().optional().describe('First criterion (e.g., ">100")'),
          criterion2: z.string().optional().describe('Second criterion'),
          operator: z
            .enum(['And', 'Or'])
            .optional()
            .describe('Operator for combining criteria')
        })
        .optional()
        .describe('Filter criteria (for filter action)'),
      sessionId: z.string().optional().describe('Optional workbook session ID')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExcelClient({
      token: ctx.auth.token,
      driveId: ctx.config.driveId,
      siteId: ctx.config.siteId,
      sessionId: ctx.input.sessionId
    });

    switch (ctx.input.action) {
      case 'sort': {
        if (!ctx.input.sortFields || ctx.input.sortFields.length === 0) {
          throw new Error('sortFields is required for sort action');
        }
        await client.applyTableSort(
          ctx.input.workbookItemId,
          ctx.input.tableIdOrName,
          ctx.input.sortFields
        );
        return {
          output: { success: true },
          message: `Sorted table **${ctx.input.tableIdOrName}** by ${ctx.input.sortFields.length} field(s).`
        };
      }
      case 'clearSort': {
        await client.clearTableSort(ctx.input.workbookItemId, ctx.input.tableIdOrName);
        return {
          output: { success: true },
          message: `Cleared sort on table **${ctx.input.tableIdOrName}**.`
        };
      }
      case 'filter': {
        if (ctx.input.filterColumnIndex === undefined) {
          throw new Error('filterColumnIndex is required for filter action');
        }
        if (!ctx.input.filterCriteria) {
          throw new Error('filterCriteria is required for filter action');
        }
        await client.applyTableFilter(
          ctx.input.workbookItemId,
          ctx.input.tableIdOrName,
          ctx.input.filterColumnIndex,
          ctx.input.filterCriteria
        );
        return {
          output: { success: true },
          message: `Applied filter to column ${ctx.input.filterColumnIndex} on table **${ctx.input.tableIdOrName}**.`
        };
      }
      case 'clearFilters': {
        await client.clearTableFilters(ctx.input.workbookItemId, ctx.input.tableIdOrName);
        return {
          output: { success: true },
          message: `Cleared all filters on table **${ctx.input.tableIdOrName}**.`
        };
      }
    }
  })
  .build();
