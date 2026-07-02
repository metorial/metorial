import { SlateTool } from 'slates';
import { z } from 'zod';
import { PowerBIClient } from '../lib/client';
import { spec } from '../spec';

export let pushData = SlateTool.create(spec, {
  name: 'Push Data to Table',
  key: 'push_data',
  description: `Push rows of data into a Power BI push dataset table or delete all rows from a table. Useful for real-time and streaming dashboard scenarios.`,
  instructions: [
    'Use action "push" to add rows to a table. Each row must match the table schema.',
    'Use action "delete" to clear all rows from a table.'
  ],
  constraints: [
    'The target dataset must be a push dataset.',
    'Maximum 10,000 rows per single push request.'
  ]
})
  .input(
    z.object({
      action: z.enum(['push', 'delete']).describe('Whether to push rows or delete all rows'),
      datasetId: z.string().describe('ID of the push dataset'),
      tableName: z.string().describe('Name of the table'),
      workspaceId: z.string().optional().describe('Workspace ID containing the dataset'),
      rows: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Array of row objects to push (required for push action)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      rowCount: z.number().optional().describe('Number of rows pushed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PowerBIClient({ token: ctx.auth.token });
    let { action, datasetId, tableName, workspaceId, rows } = ctx.input;

    if (action === 'push') {
      if (!rows || rows.length === 0) throw new Error('rows are required for push action');
      await client.pushRows(datasetId, tableName, rows, workspaceId);
      return {
        output: { success: true, rowCount: rows.length },
        message: `Pushed **${rows.length}** row(s) to table **${tableName}**.`
      };
    }

    await client.deleteRows(datasetId, tableName, workspaceId);
    return {
      output: { success: true },
      message: `Deleted all rows from table **${tableName}** in dataset **${datasetId}**.`
    };
  })
  .build();
