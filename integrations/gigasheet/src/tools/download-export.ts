import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GigasheetClient } from '../lib/client';
import { getExportDownload } from '../lib/files';
import { spec } from '../spec';

export let downloadExport = SlateTool.create(spec, {
  name: 'Download Export',
  key: 'download_export',
  description: `Prepare a downloadable CSV export. The export must have finished processing. Optionally checks the export status before downloading.`,
  instructions: [
    'Use this after creating an export with the Export Sheet tool.',
    'If checkStatus is true, the tool will first verify the export is ready before attempting download.'
  ]
})
  .input(
    z.object({
      sheetHandle: z
        .string()
        .describe('Handle of the source sheet. Downloads use exportHandle.'),
      exportHandle: z
        .string()
        .describe('Handle of the export to download. Discover exports with list_exports.'),
      checkStatus: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to check that the export state is processed before downloading')
    })
  )
  .output(
    z.object({
      downloadUrl: z
        .string()
        .optional()
        .describe('Pre-signed URL to download the export file'),
      status: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Export metadata and processing status if checked'),
      downloadResult: z.record(z.string(), z.unknown()).describe('Full download response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GigasheetClient({ token: ctx.auth.token });

    let status: Record<string, unknown> | undefined;

    if (ctx.input.checkStatus) {
      status = await client.describeDataset(ctx.input.exportHandle);
      let state = status.Status ?? status.status;
      if (state !== 'processed')
        throw createApiServiceError(
          `The export is not ready for download (state: ${typeof state === 'string' ? state : 'unknown'}). Check again after processing finishes.`
        );
    }

    let downloadResult = await client.downloadExport(
      ctx.input.sheetHandle,
      ctx.input.exportHandle
    );
    let download = getExportDownload(downloadResult);
    let downloadUrl = download.url;
    await ctx.addAttachment({
      type: 'url',
      url: download.url,
      refreshAt: download.expiresAt,
      refreshReference: { exportHandle: ctx.input.exportHandle }
    });

    return {
      output: {
        downloadUrl,
        status,
        downloadResult
      },
      message: downloadUrl
        ? `Export is ready for download.`
        : `Export download response received. Check the downloadResult for details.`
    };
  })
  .build();
