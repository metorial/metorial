import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { googleSheetsActionScopes } from '../scopes';
import { spec } from '../spec';

export let setDataValidation = SlateTool.create(spec, {
  name: 'Set Data Validation',
  key: 'set_data_validation',
  description: `Sets data validation rules on a range of cells. Restrict input to dropdown lists, number ranges, date constraints, checkbox, or custom formulas. Can show warnings or reject invalid input.`,
  instructions: [
    'Use conditionType "ONE_OF_LIST" with conditionValues for dropdown lists.',
    'Use conditionType "NUMBER_BETWEEN" with two conditionValues for number ranges.',
    'Use conditionType "BOOLEAN" for checkboxes.',
    'Use conditionType "CUSTOM_FORMULA" with a single conditionValue containing the formula.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleSheetsActionScopes.setDataValidation)
  .input(
    z.object({
      spreadsheetId: z.string().describe('Unique ID of the spreadsheet'),
      sheetId: z.number().describe('Numeric ID of the sheet'),
      startRowIndex: z.number().describe('Start row index (0-based, inclusive)'),
      endRowIndex: z.number().describe('End row index (0-based, exclusive)'),
      startColumnIndex: z.number().describe('Start column index (0-based, inclusive)'),
      endColumnIndex: z.number().describe('End column index (0-based, exclusive)'),
      conditionType: z
        .enum([
          'ONE_OF_LIST',
          'ONE_OF_RANGE',
          'NUMBER_BETWEEN',
          'NUMBER_NOT_BETWEEN',
          'NUMBER_EQ',
          'NUMBER_NOT_EQ',
          'NUMBER_GREATER',
          'NUMBER_GREATER_THAN_EQ',
          'NUMBER_LESS',
          'NUMBER_LESS_THAN_EQ',
          'TEXT_CONTAINS',
          'TEXT_NOT_CONTAINS',
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
          'BOOLEAN',
          'CUSTOM_FORMULA'
        ])
        .describe('Type of validation condition'),
      conditionValues: z
        .array(z.string())
        .optional()
        .describe('Values for the condition (e.g., list items, min/max numbers, formula)'),
      strict: z
        .boolean()
        .optional()
        .describe('If true, reject invalid input. If false (default), show a warning.'),
      showCustomUi: z
        .boolean()
        .optional()
        .describe('If true, show a dropdown for list validations. Defaults to true.'),
      inputMessage: z
        .string()
        .optional()
        .describe('Help message to show when the cell is selected')
    })
  )
  .output(
    z.object({
      spreadsheetId: z.string().describe('ID of the spreadsheet'),
      validatedRange: z.string().describe('Description of the validated range')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient(ctx.auth.token);
    let input = ctx.input;

    let conditionValues = input.conditionValues?.map(v => ({ userEnteredValue: v }));

    let rule: Record<string, any> = {
      condition: {
        type: input.conditionType,
        values: conditionValues
      },
      strict: input.strict ?? false,
      showCustomUi: input.showCustomUi ?? true
    };

    if (input.inputMessage) {
      rule.inputMessage = input.inputMessage;
    }

    await client.batchUpdate(input.spreadsheetId, [
      {
        setDataValidation: {
          range: {
            sheetId: input.sheetId,
            startRowIndex: input.startRowIndex,
            endRowIndex: input.endRowIndex,
            startColumnIndex: input.startColumnIndex,
            endColumnIndex: input.endColumnIndex
          },
          rule
        }
      }
    ]);

    let rangeDesc = `Sheet ${input.sheetId} [${input.startRowIndex}:${input.endRowIndex}, ${input.startColumnIndex}:${input.endColumnIndex}]`;

    return {
      output: {
        spreadsheetId: input.spreadsheetId,
        validatedRange: rangeDesc
      },
      message: `Set ${input.conditionType} data validation on ${rangeDesc}.`
    };
  })
  .build();
