import { createApiServiceError, getFileUrlTool } from 'slates';
import { LogoDevClient } from '../lib/client';
import { prepareImageDownload } from '../lib/images';
import { imageReferenceSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = imageReferenceSchema.safeParse(ctx.input.reference);
  if (!reference.success) {
    throw createApiServiceError('The image reference is invalid. Request the file again.');
  }
  let { brandId, kind, options } = reference.data;
  let response = await new LogoDevClient(ctx.auth.token).lookupBrand(brandId, 'brand_id');
  if (!response.settled) {
    throw createApiServiceError(
      response.metadata.pending?.message ??
        'This brand image is no longer available. Request the file again.'
    );
  }
  let image = response.data[kind];
  if (image === null) {
    throw createApiServiceError(
      'This brand image is no longer available. Request the file again.'
    );
  }
  let download = prepareImageDownload(image, options);
  return { url: download.url, expiresAt: download.expiresAt };
});
