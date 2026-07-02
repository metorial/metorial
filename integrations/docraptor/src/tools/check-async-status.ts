import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkAsyncStatus = SlateTool.create(spec, {
  name: 'Check Async Document Status',
  key: 'check_async_status',
  description: `Checks the status of an asynchronously created document. Returns the current processing status and, when completed, a download URL for retrieving the generated document. The download URL can be used up to 100 times and expires based on the account's data retention period.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      statusId: z
        .string()
        .describe('The status ID returned from an async document creation request.')
    })
  )
  .output(
    z.object({
      status: z
        .enum(['queued', 'working', 'completed', 'failed', 'killed'])
        .describe('Current processing status of the document.'),
      downloadUrl: z
        .string()
        .optional()
        .describe(
          'URL to download the completed document. Only present when status is "completed".'
        ),
      numberOfPages: z
        .number()
        .optional()
        .describe('Number of pages in the generated document. Only present when completed.'),
      message: z.string().optional().describe('Status message from DocRaptor.'),
      validationErrors: z
        .string()
        .optional()
        .describe('Error details if the document failed to generate.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getAsyncStatus(ctx.input.statusId);

    let statusMessage = `Document status: **${result.status}**`;
    if (result.status === 'completed' && result.downloadUrl) {
      statusMessage += `. Download URL: ${result.downloadUrl}`;
      if (result.numberOfPages) {
        statusMessage += ` (${result.numberOfPages} pages)`;
      }
    } else if (result.status === 'failed') {
      statusMessage += `. Error: ${result.validationErrors || result.message || 'Unknown error'}`;
    }

    return {
      output: result,
      message: statusMessage
    };
  })
  .build();
