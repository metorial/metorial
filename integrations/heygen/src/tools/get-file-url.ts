import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

// Renew signed provider URLs on the next download after a short conservative interval.
export const mediaRefreshAt = () => new Date(Date.now() + 60_000).toISOString();

export const getFileUrl = getFileUrlTool(spec, async ctx => {
  const reference = z
    .object({
      kind: z.enum(['video', 'translation']),
      id: z.string().min(1),
      field: z.enum(['video', 'subtitles', 'audio', 'vtt'])
    })
    .safeParse(ctx.input.reference);
  if (!reference.success)
    throw createApiServiceError('The file reference is invalid. Request the file again.');
  const client = new HeyGenClient(ctx.auth);
  let url: string | null;
  if (reference.data.kind === 'video') {
    const video = await client.getVideoStatus(reference.data.id);
    url =
      reference.data.field === 'video'
        ? video.videoUrl
        : reference.data.field === 'subtitles'
          ? video.caption
          : null;
  } else {
    const translation = await client.getTranslationStatus(reference.data.id);
    url =
      reference.data.field === 'video'
        ? (translation.targetLanguages[0]?.videoUrl ?? null)
        : reference.data.field === 'subtitles'
          ? translation.srtCaptionUrl
          : reference.data.field === 'audio'
            ? translation.audioUrl
            : translation.vttCaptionUrl;
  }
  if (!url)
    throw createApiServiceError(
      'This file is not available. Check the video or translation status again.'
    );
  return { url, expiresAt: mediaRefreshAt() };
});
