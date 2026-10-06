import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { TldvClient } from '../lib/client';
import { spec } from '../spec';

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = z.object({ meetingId: z.string().min(1) }).safeParse(ctx.input.reference);
  if (!reference.success) {
    throw createApiServiceError(
      'The recording reference is invalid. Request the recording again.'
    );
  }
  let client = new TldvClient({ token: ctx.auth.token });
  let result = await client.getDownloadUrl(reference.data.meetingId);
  return { url: result.url, expiresAt: result.expiresAt, headers: {}, query: {} };
});
