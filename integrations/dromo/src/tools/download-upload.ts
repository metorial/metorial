import { SlateTool } from 'slates';
import { z } from 'zod';
import { DromoClient } from '../lib/client';
import { createDownloadAttachment } from '../lib/files';
import { spec } from '../spec';

export let downloadUpload = SlateTool.create(spec, {
  name: 'Download Upload Results',
  key: 'download_upload',
  description:
    'Downloads the processed JSON data for a completed upload. Use list_uploads to find upload IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({ uploadId: z.string().describe('Upload ID from list_uploads or get_upload') })
  )
  .output(z.object({ uploadId: z.string(), mimeType: z.string() }))
  .handleInvocation(async ctx => {
    let client = new DromoClient({ token: ctx.auth.token });
    let { url } = await client.getUploadDownloadUrl(ctx.input.uploadId);
    await ctx.addAttachment(createDownloadAttachment(url, 'upload', ctx.input.uploadId));
    return {
      output: { uploadId: ctx.input.uploadId, mimeType: 'application/json' },
      message: `Prepared upload **${ctx.input.uploadId}** results for download.`
    };
  })
  .build();
