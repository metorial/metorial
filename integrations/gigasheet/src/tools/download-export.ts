import { SlateTool } from 'slates';
import { z } from 'zod';
import { GigasheetClient } from '../lib/client';
import { spec } from '../spec';

export let downloadExport = SlateTool.create(spec, {
  name: 'Download Export',
  key: 'download_export',
  description: `Get the download URL for a completed export. Returns a pre-signed S3 URL that can be used to download the exported file (ZIP containing CSV). Also supports checking operation status before downloading.`,
  instructions: [
    'Use this after creating an export with the Export Sheet tool.',
    'If checkStatus is true, the tool will first verify the export is ready before attempting download.'
  ]
})
  .input(
    z.object({
      sheetHandle: z.string().describe('Handle of the sheet the export belongs to'),
      exportHandle: z.string().describe('Handle of the export to download'),
      checkStatus: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to check the operation status before downloading')
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
        .describe('Operation status if checked'),
      downloadResult: z.record(z.string(), z.unknown()).describe('Full download response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GigasheetClient({ token: ctx.auth.token });

    let status: Record<string, unknown> | undefined;

    if (ctx.input.checkStatus) {
      status = await client.getOperationStatus(ctx.input.sheetHandle);
    }

    let downloadResult = await client.downloadExport(
      ctx.input.sheetHandle,
      ctx.input.exportHandle
    );
    let downloadUrl = typeof downloadResult?.url === 'string' ? downloadResult.url : undefined;

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
