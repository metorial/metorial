import { SlateTool } from 'slates';
import { z } from 'zod';
import { UploadClient } from '../lib/upload-client';
import { spec } from '../spec';

export let getUrlUploadStatus = SlateTool.create(spec, {
  name: 'Get URL Upload Status',
  key: 'get_url_upload_status',
  description:
    'Check the progress or failure of a file upload started by upload_from_url. A token identifies the upload task, while fileId identifies the resulting file.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      uploadToken: z.string().describe('Upload task token returned by upload_from_url')
    })
  )
  .output(
    z.object({
      status: z
        .string()
        .describe(
          'Provider upload state, including waiting, progress, success, error, or unknown'
        ),
      fileId: z.string().optional().describe('Uploaded file UUID, when available'),
      filename: z.string().optional(),
      originalFilename: z.string().optional(),
      size: z.number().optional().describe('Uploaded file size in bytes'),
      totalBytes: z.number().optional(),
      completedBytes: z.number().optional(),
      isStored: z.boolean().optional(),
      isReady: z.boolean().optional(),
      mimeType: z.string().optional(),
      error: z.string().optional().describe('Provider failure reason, when status is error'),
      errorCode: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new UploadClient(
      ctx.auth.publicKey,
      ctx.auth.secretKey
    ).getUrlUploadStatus(ctx.input.uploadToken);
    return {
      output: {
        status: result.status,
        fileId: result.uuid ?? result.file_id,
        filename: result.filename,
        originalFilename: result.original_filename,
        size: result.size,
        totalBytes: result.total,
        completedBytes: result.done,
        isStored: result.is_stored,
        isReady: result.is_ready,
        mimeType: result.mime_type,
        error: result.error,
        errorCode: result.error_code
      },
      message: `URL upload status: **${result.status}**.${result.error ? ` ${result.error}` : ''}`
    };
  })
  .build();
