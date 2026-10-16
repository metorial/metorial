import { createApiServiceError } from 'slates';
import type { z } from 'zod';
import type { imageDownloadOptionsSchema, imageSchema } from './schemas';

export let prepareImageDownload = (
  image: z.infer<typeof imageSchema>,
  options: z.infer<typeof imageDownloadOptionsSchema>
) => {
  let url = new URL(image.url);
  if (url.protocol !== 'https:') {
    throw createApiServiceError('Logo.dev returned an insecure image download URL.', {
      reason: 'logo_dev_invalid_response'
    });
  }
  let expiresAt = Date.parse(image.expires_at);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() + 60000) {
    throw createApiServiceError(
      'Logo.dev returned an expired image URL. Request the file again.',
      {
        reason: 'logo_dev_invalid_response'
      }
    );
  }
  let format = options.format ?? 'png';
  if (options.theme === 'dark' && format === 'jpg') {
    throw createApiServiceError('Use PNG or WebP format with the dark theme.');
  }
  url.searchParams.set('format', format);
  if (options.size !== undefined) url.searchParams.set('size', String(options.size));
  if (options.theme !== undefined) url.searchParams.set('theme', options.theme);

  return {
    url: url.toString(),
    expiresAt: new Date(expiresAt - 60000).toISOString(),
    mimeType: format === 'jpg' ? 'image/jpeg' : `image/${format}`
  };
};
