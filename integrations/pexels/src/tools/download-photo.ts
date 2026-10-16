import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { photoSchema } from '../lib/schemas';
import { spec } from '../spec';

export let downloadPhoto = SlateTool.create(spec, {
  name: 'Download Photo',
  key: 'download_photo',
  description:
    'Download a Pexels photo at its original size or a selected image size. Returns photo metadata and a downloadable image. Use search_photos or get_photo to find the photo ID.',
  instructions: ['Credit Pexels and the photographer when using the photo.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      photoId: z.number().describe('Pexels photo ID from search_photos or get_photo'),
      size: z
        .enum([
          'original',
          'large2x',
          'large',
          'medium',
          'small',
          'portrait',
          'landscape',
          'tiny'
        ])
        .default('original')
        .describe('Image size to download. Defaults to original.')
    })
  )
  .output(photoSchema)
  .handleInvocation(async ctx => {
    let photo = await new Client(ctx.auth).getPhoto(ctx.input.photoId);
    let url = photo.src[ctx.input.size];
    if (!url) throw createApiServiceError('Pexels did not return the requested image size.');
    await ctx.addAttachment({ type: 'url', url });
    return {
      output: photo,
      message: `Prepared photo **#${photo.photoId}** by **${photo.photographer}** for download.`
    };
  })
  .build();
