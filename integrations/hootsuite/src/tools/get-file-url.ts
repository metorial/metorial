import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { HootsuiteClient } from '../lib/client';
import { type Media, trustedMediaUrl } from '../lib/schemas';
import { spec } from '../spec';

let referenceSchema = z.object({ mediaId: z.string().min(1) });

export let mediaDownload = (media: Media, requestedAt: number) => {
  if (media.state !== 'READY' || !media.downloadUrl || !media.downloadUrlDurationSeconds) {
    throw createApiServiceError(
      'The media is not ready for download. Request its status again after processing finishes.'
    );
  }
  let url = trustedMediaUrl(media.downloadUrl, 'download');
  let parsed = new URL(url);
  let expires = requestedAt + media.downloadUrlDurationSeconds * 1000;
  let legacyExpiry = parsed.searchParams.get('Expires');
  let signedDate = parsed.searchParams.get('X-Amz-Date');
  let signedDuration = parsed.searchParams.get('X-Amz-Expires');
  if (legacyExpiry !== null) {
    if (
      !/^\d+$/.test(legacyExpiry) ||
      !Number.isSafeInteger(Number(legacyExpiry)) ||
      Number(legacyExpiry) <= 0
    )
      throw createApiServiceError(
        'The media download expiry is invalid. Request status again.'
      );
    expires = Math.min(expires, Number(legacyExpiry) * 1000);
  }
  if (signedDate !== null || signedDuration !== null) {
    if (
      !signedDate ||
      !/^\d{8}T\d{6}Z$/.test(signedDate) ||
      !signedDuration ||
      !/^\d+$/.test(signedDuration) ||
      !Number.isSafeInteger(Number(signedDuration)) ||
      Number(signedDuration) <= 0
    ) {
      throw createApiServiceError(
        'The media download expiry is invalid. Request status again.'
      );
    }
    let date = `${signedDate.slice(0, 4)}-${signedDate.slice(4, 6)}-${signedDate.slice(6, 8)}T${signedDate.slice(9, 11)}:${signedDate.slice(11, 13)}:${signedDate.slice(13, 15)}Z`;
    let timestamp = Date.parse(date);
    if (
      !Number.isFinite(timestamp) ||
      new Date(timestamp).toISOString().slice(0, 19) !== date.slice(0, 19)
    ) {
      throw createApiServiceError(
        'The media download expiry is invalid. Request status again.'
      );
    }
    expires = Math.min(expires, timestamp + Number(signedDuration) * 1000);
  }
  if (
    !Number.isFinite(expires) ||
    expires <= Date.now() ||
    !Number.isFinite(new Date(expires).getTime())
  ) {
    throw createApiServiceError(
      'The media download URL has expired or has no usable expiry. Request status again.'
    );
  }
  return { url, expiresAt: new Date(expires).toISOString(), headers: {}, query: {} };
};

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = referenceSchema.safeParse(ctx.input.reference);
  if (!reference.success)
    throw createApiServiceError(
      'The media reference is invalid. Request a new download from upload_media.'
    );
  trustedMediaUrl(ctx.input.url, 'download');
  let requestedAt = Date.now();
  let media = await new HootsuiteClient(ctx.auth.token).getMediaUploadStatus(
    reference.data.mediaId
  );
  return mediaDownload(media, requestedAt);
});
