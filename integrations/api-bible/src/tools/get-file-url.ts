import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let referenceSchema = z.object({ audioBibleId: z.string(), chapterId: z.string() });

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = referenceSchema.safeParse(ctx.input.reference);
  if (!reference.success) {
    throw createApiServiceError('The audio reference is invalid. Request the chapter again.');
  }
  let result = await new Client({ token: ctx.auth.token }).getAudioChapter(
    reference.data.audioBibleId,
    reference.data.chapterId
  );
  if (!result.data.resourceUrl) {
    throw createApiServiceError('API.Bible did not return an audio download URL.');
  }
  // Renew on every download; the documented numeric expiry does not specify its units.
  return { url: result.data.resourceUrl, expiresAt: new Date().toISOString() };
});
