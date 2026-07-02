import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadFile = SlateTool.create(spec, {
  name: 'Upload File',
  key: 'upload_file',
  description: `Upload a file to ConvertAPI's temporary file storage from a URL.
The uploaded file can be reused across multiple conversions by referencing its file ID, avoiding repeated uploads and improving performance.
Files are stored for a maximum of 3 hours.`,
  constraints: ['Uploaded files are automatically deleted after 3 hours.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      fileUrl: z.string().describe('Public URL of the file to upload to ConvertAPI storage')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('ConvertAPI file ID for referencing in conversions'),
      fileName: z.string().describe('Name of the uploaded file'),
      fileExt: z.string().describe('Extension of the uploaded file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.uploadFileFromUrl(ctx.input.fileUrl);

    return {
      output: result,
      message: `Uploaded \`${result.fileName}\` to ConvertAPI storage. File ID: \`${result.fileId}\`. Valid for 3 hours.`
    };
  })
  .build();
