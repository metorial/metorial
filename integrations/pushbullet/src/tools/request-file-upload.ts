import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let requestFileUpload = SlateTool.create(spec, {
  name: 'Request File Upload',
  key: 'request_file_upload',
  description: `Request an upload URL from Pushbullet for uploading a file. Returns the upload URL (for uploading via multipart/form-data) and the resulting file URL that can be used in file pushes or MMS messages.`,
  instructions: [
    'After receiving the upload URL, upload the file to it using a multipart/form-data POST request with the file as the "file" field.',
    'Then use the returned fileUrl when sending a file push or MMS message.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      fileName: z.string().describe('Name of the file to upload (e.g., "photo.jpg")'),
      fileType: z.string().describe('MIME type of the file (e.g., "image/jpeg")')
    })
  )
  .output(
    z.object({
      fileName: z.string().describe('Processed file name'),
      fileType: z.string().describe('Processed MIME type'),
      fileUrl: z.string().describe('URL where the file will be accessible after upload'),
      uploadUrl: z.string().describe('URL to upload the file to via multipart/form-data POST')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.requestUpload(ctx.input.fileName, ctx.input.fileType);

    return {
      output: {
        fileName: result.file_name,
        fileType: result.file_type,
        fileUrl: result.file_url,
        uploadUrl: result.upload_url
      },
      message: `Upload URL generated for **${result.file_name}**. Upload the file to the uploadUrl, then use the fileUrl in a file push.`
    };
  })
  .build();
