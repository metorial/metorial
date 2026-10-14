import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkAsyncStatus = SlateTool.create(spec, {
  name: 'Check Async Document Status',
  key: 'check_async_status',
  description: `Checks the status of an asynchronously created document. Returns the current processing status and, when completed, a downloadable document and its download URL. Non-hosted async documents allow up to five downloads (once with the shortest data retention setting) and expire based on account retention. Hosted async documents follow their configured download limit and expiration, with unlimited downloads and hosting by default; test hosted documents allow five downloads and expire after one day.`,
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
      downloadId: z
        .string()
        .optional()
        .describe(
          'Download ID when returned by DocRaptor, including for expiring hosted documents.'
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

    if (result.status === 'completed' && result.downloadUrl) {
      await ctx.addAttachment({
        type: 'url',
        url: result.downloadId
          ? `https://api.docraptor.com/download/${encodeURIComponent(result.downloadId)}`
          : result.downloadUrl,
        ...(result.downloadId ? { query: { user_credentials: ctx.auth.token } } : {})
      });
    }

    let statusMessage = `Document status: **${result.status}**`;
    if (result.status === 'completed' && result.downloadUrl) {
      statusMessage += `. Download URL: ${result.downloadUrl}`;
      if (result.numberOfPages) {
        statusMessage += ` (${result.numberOfPages} pages)`;
      }
    } else if (result.status === 'failed' || result.status === 'killed') {
      statusMessage += `. Error: ${result.validationErrors || result.message || 'Unknown error'}`;
    }

    return {
      output: result,
      message: statusMessage
    };
  })
  .build();
