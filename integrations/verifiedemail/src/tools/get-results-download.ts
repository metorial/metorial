import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { resultsDownloadSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getResultsDownload = SlateTool.create(spec, {
  name: 'Get Results Download',
  key: 'get_results_download',
  description:
    'Check a results export request and retrieve its downloadable file when its status is completed. Call request_results_download first to obtain a download ID.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      downloadId: z
        .string()
        .min(1)
        .describe('Download ID returned by request_results_download')
    })
  )
  .output(resultsDownloadSchema)
  .handleInvocation(async ctx => {
    let download = await new Client({ token: ctx.auth.token }).getResultsDownload(
      ctx.input.downloadId
    );
    let result = resultsDownloadSchema.safeParse(download);
    if (!result.success) {
      throw createApiServiceError(
        'VerifiedEmail returned an invalid download request response.'
      );
    }
    if (download.status === 'completed') {
      let url = z.url().safeParse(download.url);
      if (!url.success || new URL(url.data).protocol !== 'https:') {
        throw createApiServiceError(
          'VerifiedEmail marked this export complete but did not return a valid secure download URL. Request the export again.'
        );
      }
      await ctx.addAttachment({ type: 'url', url: url.data });
    }
    return {
      output: result.data,
      message:
        download.status === 'completed'
          ? `Verification results for list ${download.listId} are ready to download.`
          : download.status === 'failed' || download.status === 'deleted'
            ? `Results download ${download.id} is **${download.status}**. Request a new export with request_results_download.`
            : `Results download ${download.id} is **${download.status}**. Check again after processing completes.`
    };
  })
  .build();
