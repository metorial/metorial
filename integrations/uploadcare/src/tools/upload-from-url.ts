import { SlateTool } from 'slates';
import { z } from 'zod';
import { UploadClient } from '../lib/upload-client';
import { spec } from '../spec';

export let uploadFromUrl = SlateTool.create(spec, {
  name: 'Upload from URL',
  key: 'upload_from_url',
  description: `Upload a file to Uploadcare by providing a publicly accessible URL. Uploadcare will fetch the file and store it. Returns a token to check upload status, plus the file UUID once available.`,
  instructions: [
    'The source URL must be publicly accessible.',
    'Use the returned token to poll for upload completion if the file is not immediately ready.'
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
          'Whether to permanently store the file (default: auto based on project settings)'
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
      uploadToken: z.string().describe('Token for checking upload status'),
      status: z.string().describe('Current upload status (waiting, progress, success, error)'),
      fileId: z
        .string()
        .optional()
        .describe('UUID of the uploaded file (available when status is success)')
    })
  )
  .handleInvocation(async ctx => {
    let uploadClient = new UploadClient(ctx.auth.publicKey);

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

    let statusResult = await uploadClient.getUrlUploadStatus(uploadResult.token);

    return {
      output: {
        uploadToken: uploadResult.token,
        status: statusResult.status,
        fileId: statusResult.uuid || statusResult.file_id
      },
      message:
        statusResult.status === 'success'
          ? `File uploaded successfully with UUID **${statusResult.uuid || statusResult.file_id}**.`
          : `Upload initiated, current status: **${statusResult.status}**. Use token \`${uploadResult.token}\` to check progress.`
    };
  })
  .build();
