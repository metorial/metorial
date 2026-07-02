import { SlateTool } from 'slates';
import { z } from 'zod';
import { FalClient } from '../lib/client';
import { spec } from '../spec';

export let uploadFile = SlateTool.create(spec, {
  name: 'Upload File',
  key: 'upload_file',
  description: `Upload a file to Fal.ai's CDN storage from a URL.
The uploaded file can then be referenced by its CDN URL in model inference requests.
Useful for providing input images, audio, or video files to Fal.ai models.`,
  instructions: [
    'The sourceUrl must be a publicly accessible URL.',
    'The targetPath determines where the file is stored, e.g. "inputs/my-image.jpg".'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      sourceUrl: z.string().describe('Publicly accessible URL of the file to upload'),
      targetPath: z
        .string()
        .describe('Target storage path including filename, e.g. "inputs/my-image.jpg"')
    })
  )
  .output(
    z.object({
      fileUrl: z
        .string()
        .describe('CDN URL of the uploaded file, usable in model inference requests')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FalClient(ctx.auth.token);

    ctx.progress('Uploading file...');
    let result = await client.uploadFileFromUrl(ctx.input.targetPath, ctx.input.sourceUrl);

    return {
      output: {
        fileUrl: typeof result.url === 'string' ? result.url : ctx.input.sourceUrl
      },
      message: `Uploaded file to **${ctx.input.targetPath}**.\n- CDN URL: ${typeof result.url === 'string' ? result.url : 'uploaded successfully'}`
    };
  })
  .build();
