import { SlateTool } from 'slates';
import { z } from 'zod';
import { FalClient } from '../lib/client';
import { spec } from '../spec';

export let uploadFile = SlateTool.create(spec, {
  name: 'Upload File',
  key: 'upload_file',
  description: `Copy a public file of up to 90 MiB to Fal.ai CDN storage from a URL.
The uploaded file can then be referenced by its CDN URL in model inference requests.
Useful for providing input images, audio, or video files to Fal.ai models.`,
  instructions: [
    'The sourceUrl must be a publicly accessible URL.',
    'The basename of targetPath supplies the uploaded filename; the CDN assigns its own storage location. Files expire after expiresInSeconds (default one hour).'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      sourceUrl: z
        .url()
        .regex(/^https?:\/\//)
        .describe('Publicly accessible URL of the file to upload'),
      targetPath: z
        .string()
        .min(1)
        .describe(
          'Preferred filename or path ending in a filename; the CDN assigns its own location'
        ),
      expiresInSeconds: z
        .number()
        .int()
        .min(60)
        .max(31536000)
        .optional()
        .describe(
          'File lifetime in seconds; defaults to 3600. Download or use the file before expiry'
        )
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
    let result = await client.uploadFileFromUrl(
      ctx.input.targetPath,
      ctx.input.sourceUrl,
      ctx.input.expiresInSeconds
    );
    await ctx.addAttachment({ type: 'url', url: result.url });

    return {
      output: {
        fileUrl: result.url
      },
      message: `Uploaded file.\n- CDN URL: ${result.url}`
    };
  })
  .build();
