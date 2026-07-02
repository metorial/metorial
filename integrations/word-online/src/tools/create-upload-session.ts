import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createUploadSession = SlateTool.create(spec, {
  name: 'Create Upload Session',
  key: 'create_upload_session',
  description: `Create a resumable upload session for uploading large files (>4MB) to OneDrive or SharePoint.
Returns an upload URL that accepts byte range uploads. Use this for large Word documents or other files that exceed the 4MB direct upload limit.`,
  instructions: [
    'After receiving the upload URL, upload file content in byte ranges using PUT requests to the returned URL.',
    'Upload byte ranges sequentially in order. Recommended fragment size is 5-10 MB.'
  ]
})
  .input(
    z.object({
      parentFolderId: z
        .string()
        .describe('ID of the parent folder where the file will be created'),
      fileName: z.string().describe('Name of the file to create (e.g. "LargeReport.docx")')
    })
  )
  .output(
    z.object({
      uploadUrl: z
        .string()
        .describe('The resumable upload URL. Send PUT requests with byte ranges to this URL.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      driveId: ctx.config.driveId,
      siteId: ctx.config.siteId
    });

    let session = await client.createUploadSession(
      ctx.input.parentFolderId,
      ctx.input.fileName
    );

    return {
      output: {
        uploadUrl: session.uploadUrl
      },
      message: `Upload session created for **${ctx.input.fileName}**. Use the returned URL to upload file content in byte ranges.`
    };
  })
  .build();
