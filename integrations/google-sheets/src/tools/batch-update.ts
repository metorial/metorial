import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { googleSheetsActionScopes } from '../scopes';
import { spec } from '../spec';

export let batchUpdate = SlateTool.create(spec, {
  name: 'Batch Update',
  key: 'batch_update',
  description: `Executes multiple spreadsheet update operations atomically in a single request. Supports any combination of operations such as formatting, adding/removing sheets, creating charts, merging cells, adding conditional formatting, and more. Operations are applied in order.

Use this for complex updates that need to be applied together, or when you need to perform operations not covered by other tools (e.g., conditional formatting rules, merge cells, add charts, pivot tables, filter views).`,
  instructions: [
    'Pass requests as a JSON array, not as a stringified JSON blob or an operations field.',
    'Each item in requests is a Google Sheets API batchUpdate request object.',
    'See Google Sheets API documentation for the full list of supported request types.',
    'Common request types: addSheet, deleteSheet, updateCells, mergeCells, unmergeCells, addConditionalFormatRule, addChart, updateChartSpec, addFilterView, addProtectedRange, addNamedRange, etc.'
  ],
  constraints: ['All operations succeed or fail atomically.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleSheetsActionScopes.batchUpdate)
  .input(
    z.object({
      spreadsheetId: z.string().describe('Unique ID of the spreadsheet'),
      requests: z
        .array(z.record(z.string(), z.any()))
        .describe(
          'Array of batch update request objects. Each object should have a single key identifying the operation type.'
        )
    })
  )
  .output(
    z.object({
      spreadsheetId: z.string().describe('ID of the updated spreadsheet'),
      totalUpdates: z.number().describe('Number of operations applied'),
      replies: z.array(z.any()).describe('Array of replies from each operation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient(ctx.auth.token);
    let result = await client.batchUpdate(ctx.input.spreadsheetId, ctx.input.requests);

    let replies = result.replies ?? [];
    return {
      output: {
        spreadsheetId: ctx.input.spreadsheetId,
        totalUpdates: replies.length,
        replies
      },
      message: `Executed ${ctx.input.requests.length} operation(s) on the spreadsheet. ${replies.length} replies returned.`
    };
  })
  .build();
