import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { googleSheetsActionScopes } from '../scopes';
import { spec } from '../spec';

let filterCriteriaSchema = z.object({
  columnIndex: z.number().describe('Column index (0-based) to apply the filter on'),
  hiddenValues: z.array(z.string()).optional().describe('Values to hide in this column'),
  conditionType: z
    .enum([
      'NUMBER_GREATER',
      'NUMBER_GREATER_THAN_EQ',
      'NUMBER_LESS',
      'NUMBER_LESS_THAN_EQ',
      'NUMBER_EQ',
      'NUMBER_NOT_EQ',
      'NUMBER_BETWEEN',
      'NUMBER_NOT_BETWEEN',
      'TEXT_CONTAINS',
      'TEXT_NOT_CONTAINS',
      'TEXT_STARTS_WITH',
      'TEXT_ENDS_WITH',
      'TEXT_EQ',
      'TEXT_IS_EMAIL',
      'TEXT_IS_URL',
      'DATE_EQ',
      'DATE_BEFORE',
      'DATE_AFTER',
      'DATE_ON_OR_BEFORE',
      'DATE_ON_OR_AFTER',
      'DATE_BETWEEN',
      'DATE_NOT_BETWEEN',
      'DATE_IS_VALID',
      'BLANK',
      'NOT_BLANK',
      'CUSTOM_FORMULA'
    ])
    .optional()
    .describe('Condition type for the filter'),
  conditionValues: z.array(z.string()).optional().describe('Values for the condition')
});

export let createFilterView = SlateTool.create(spec, {
  name: 'Create Filter View',
  key: 'create_filter_view',
  description: `Creates a filter view that provides a filtered perspective of data without affecting what other users see. Configure filter criteria per column including value-based and condition-based filters.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleSheetsActionScopes.createFilterView)
  .input(
    z.object({
      spreadsheetId: z.string().describe('Unique ID of the spreadsheet'),
      title: z.string().describe('Title for the filter view'),
      sheetId: z.number().describe('Sheet ID to apply the filter view on'),
      startRowIndex: z
        .number()
        .optional()
        .describe('Start row index of the range (0-based, inclusive)'),
      endRowIndex: z.number().optional().describe('End row index (0-based, exclusive)'),
      startColumnIndex: z
        .number()
        .optional()
        .describe('Start column index (0-based, inclusive)'),
      endColumnIndex: z.number().optional().describe('End column index (0-based, exclusive)'),
      criteria: z
        .array(filterCriteriaSchema)
        .optional()
        .describe('Filter criteria to apply per column'),
      sortColumnIndex: z.number().optional().describe('Column index to sort by'),
      sortOrder: z.enum(['ASCENDING', 'DESCENDING']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      filterViewId: z.number().optional().describe('ID of the created filter view'),
      title: z.string().describe('Title of the filter view')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient(ctx.auth.token);
    let input = ctx.input;

    let range: Record<string, any> = { sheetId: input.sheetId };
    if (input.startRowIndex !== undefined) range.startRowIndex = input.startRowIndex;
    if (input.endRowIndex !== undefined) range.endRowIndex = input.endRowIndex;
    if (input.startColumnIndex !== undefined) range.startColumnIndex = input.startColumnIndex;
    if (input.endColumnIndex !== undefined) range.endColumnIndex = input.endColumnIndex;

    let filterView: Record<string, any> = {
      title: input.title,
      range
    };

    if (input.criteria && input.criteria.length > 0) {
      let criteriaMap: Record<string, any> = {};
      for (let c of input.criteria) {
        let criterion: Record<string, any> = {};
        if (c.hiddenValues) criterion.hiddenValues = c.hiddenValues;
        if (c.conditionType) {
          criterion.condition = {
            type: c.conditionType,
            values: c.conditionValues?.map(v => ({ userEnteredValue: v }))
          };
        }
        criteriaMap[String(c.columnIndex)] = criterion;
      }
      filterView.criteria = criteriaMap;
    }

    if (input.sortColumnIndex !== undefined) {
      filterView.sortSpecs = [
        {
          dimensionIndex: input.sortColumnIndex,
          sortOrder: input.sortOrder ?? 'ASCENDING'
        }
      ];
    }

    let result = await client.batchUpdate(input.spreadsheetId, [
      { addFilterView: { filter: filterView } }
    ]);

    let filterViewId = result.replies?.[0]?.addFilterView?.filter?.filterViewId;

    return {
      output: {
        filterViewId,
        title: input.title
      },
      message: `Created filter view **"${input.title}"** (ID: ${filterViewId}).`
    };
  })
  .build();
