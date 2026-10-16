import { SlateTool } from 'slates';
import { z } from 'zod';
import { CincopaClient } from '../lib/client';
import { requireString, requireSuccess } from '../lib/response';
import { spec } from '../spec';

export let downloadGallery = SlateTool.create(spec, {
  key: 'download_gallery',
  name: 'Download Gallery',
  description: 'Prepare a downloadable ZIP of a gallery’s original or resized media files.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      galleryId: z.string().describe('Gallery fid from list_galleries'),
      type: z
        .enum(['original', 'resized'])
        .optional()
        .describe('File version; the provider defaults to original')
    })
  )
  .output(z.object({ success: z.boolean(), downloadUrl: z.string() }))
  .handleInvocation(async ctx => {
    let data = await new CincopaClient(ctx.auth).downloadGallery(
      ctx.input.galleryId,
      ctx.input.type
    );
    let success = requireSuccess(data);
    let downloadUrl = requireString(data.download_link, 'the gallery download link');
    await ctx.addAttachment({ type: 'url', url: downloadUrl, mimeType: 'application/zip' });
    return {
      output: { success, downloadUrl },
      message: 'Prepared the gallery ZIP for download.'
    };
  })
  .build();
