import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { UploadClient } from '../lib/upload-client';
import { spec } from '../spec';

export let uploadFromUrl = SlateTool.create(spec, {
  name: 'Upload from URL',
  key: 'upload_from_url',
  description: `Upload a file to Uploadcare by providing a publicly accessible URL. Uploadcare fetches the file using your selected storage option. Returns an upload token, or an existing file when duplicate prevention finds a match.`,
  instructions: [
    'The source URL must be publicly accessible.',
    'Call get_url_upload_status with the returned token to poll for upload completion if the file is not immediately ready.'
  ]
})
  .input(
    z.object({
      sourceUrl: z.string().describe('Publicly accessible URL of the file to upload'),
      filename: z
        .string()
        .optional()
        .describe('Custom filename to assign to the uploaded file'),
      store: z
        .boolean()
        .optional()
        .describe(
          'Whether to permanently store the file; omitted uses the provider default for your account'
        ),
      checkUrlDuplicates: z
        .boolean()
        .optional()
        .describe('Check for duplicate source URLs to avoid re-uploading'),
      saveUrlDuplicates: z
        .boolean()
        .optional()
        .describe('Save duplicate source URL files if found'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value metadata to attach to the file')
    })
  )
  .output(
    z.object({
      uploadToken: z
        .string()
        .optional()
        .describe(
          'Token for checking upload status; absent when an existing duplicate file is returned'
        ),
      status: z
        .string()
        .describe(
          'Current upload status (waiting, progress, success, error), or file for an existing duplicate'
        ),
      originalFilename: z
        .string()
        .optional()
        .describe('Original filename when an existing duplicate is returned'),
      size: z
        .number()
        .optional()
        .describe('Size in bytes when an existing duplicate is returned'),
      mimeType: z
        .string()
        .optional()
        .describe('MIME type when an existing duplicate is returned'),
      fileId: z.string().optional().describe('UUID of the uploaded or existing duplicate file')
    })
  )
  .handleInvocation(async ctx => {
    let uploadClient = new UploadClient(ctx.auth.publicKey, ctx.auth.secretKey);

    let storeValue: string | undefined;
    if (ctx.input.store === true) storeValue = '1';
    else if (ctx.input.store === false) storeValue = '0';

    let uploadResult = await uploadClient.uploadFromUrl({
      sourceUrl: ctx.input.sourceUrl,
      store: storeValue,
      filename: ctx.input.filename,
      checkUrlDuplicates: ctx.input.checkUrlDuplicates,
      saveUrlDuplicates: ctx.input.saveUrlDuplicates,
      metadata: ctx.input.metadata
    });

    if (uploadResult.type === 'file') {
      return {
        output: {
          status: uploadResult.type,
          fileId: uploadResult.uuid,
          originalFilename: uploadResult.original_filename,
          size: uploadResult.size,
          mimeType: uploadResult.mime_type
        },
        message: `Found the existing file **${uploadResult.uuid}** for this source URL.`
      };
    }

    let statusResult = await uploadClient.getUrlUploadStatus(uploadResult.token);
    if (statusResult.status === 'error') {
      throw createApiServiceError(
        statusResult.error ?? 'Uploadcare could not fetch the source URL.',
        {
          reason: 'uploadcare_url_upload_failed',
          upstreamCode: statusResult.error_code
        }
      );
    }

    return {
      output: {
        uploadToken: uploadResult.token,
        status: statusResult.status,
        fileId: statusResult.uuid ?? statusResult.file_id
      },
      message:
        statusResult.status === 'success'
          ? `File uploaded with UUID **${statusResult.uuid ?? statusResult.file_id}**.`
          : `Upload initiated, current status: **${statusResult.status}**. Call get_url_upload_status with token \`${uploadResult.token}\` to check progress.`
    };
  })
  .build();
