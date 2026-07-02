import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOperationStatus = SlateTool.create(spec, {
  name: 'Get Operation Status',
  key: 'get_operation_status',
  description: `Check the status of an asynchronous FullStory operation such as user deletion or segment export. If the operation is a completed export, also retrieves the download URL for the results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      operationId: z.string().describe('ID of the operation to check')
    })
  )
  .output(
    z.object({
      operationId: z.string().describe('Operation ID'),
      type: z.string().describe('Type of operation (e.g., SEARCH_EXPORT, DELETE_USER)'),
      state: z.string().describe('Current state (e.g., PENDING, RUNNING, COMPLETED, FAILED)'),
      progress: z.number().optional().describe('Progress percentage (0-100)'),
      step: z.string().optional().describe('Current step description'),
      created: z.string().optional().describe('When the operation was created (ISO 8601)'),
      finished: z.string().optional().describe('When the operation finished (ISO 8601)'),
      downloadUrl: z
        .string()
        .optional()
        .describe('Download URL for completed export operations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let operation = await client.getOperation(ctx.input.operationId);

    let downloadUrl: string | undefined;
    if (operation.state === 'COMPLETED' && operation.results) {
      let exportId = operation.results.searchExportId;
      if (exportId) {
        try {
          let exportResults = await client.getExportResults(exportId);
          downloadUrl = exportResults.downloadUrl;
        } catch {
          // Export results may not be available for all operation types
        }
      }
    }

    return {
      output: {
        operationId: operation.operationId,
        type: operation.type,
        state: operation.state,
        progress: operation.progress,
        step: operation.step,
        created: operation.created,
        finished: operation.finished,
        downloadUrl
      },
      message: `Operation \`${operation.operationId}\` is **${operation.state}**${operation.progress !== undefined ? ` (${operation.progress}%)` : ''}.`
    };
  })
  .build();
