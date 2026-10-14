import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { resultsDownloadSchema } from '../lib/schemas';
import { spec } from '../spec';

export let requestResultsDownload = SlateTool.create(spec, {
  name: 'Request Results Download',
  key: 'request_results_download',
  description:
    'Prepare a downloadable export of email list verification results. Returns a download request ID; call get_results_download with that ID to check readiness and retrieve the file.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      listId: z
        .string()
        .min(1)
        .describe('List ID returned by create_email_list or list_email_lists'),
      include: z
        .array(
          z.enum([
            'pending',
            'malformed',
            'ghost',
            'unknown',
            'nonexistent',
            'failed',
            'full',
            'deliverable'
          ])
        )
        .min(1)
        .optional()
        .describe('Optional verification categories to include in the export')
    })
  )
  .output(resultsDownloadSchema)
  .handleInvocation(async ctx => {
    let download = await new Client({ token: ctx.auth.token }).requestResultsDownload(
      ctx.input.listId,
      ctx.input.include
    );
    let result = resultsDownloadSchema.safeParse(download);
    if (!result.success) {
      throw createApiServiceError(
        'VerifiedEmail returned an invalid download request response.'
      );
    }
    return {
      output: result.data,
      message: `Results download ${result.data.id} is **${result.data.status}**. Call get_results_download with this ID to retrieve the file when ready.`
    };
  })
  .build();
