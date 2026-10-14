import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { HyperbrowserClient } from '../lib/client';
import { spec } from '../spec';

let referenceSchema = z.object({
  sessionId: z.string(),
  kind: z.enum(['recording', 'video', 'downloads'])
});

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = referenceSchema.safeParse(ctx.input.reference);
  if (!reference.success) {
    throw createApiServiceError(
      'The file reference is invalid. Request the recording or downloads again.'
    );
  }
  let client = new HyperbrowserClient({ token: ctx.auth.token });
  let { sessionId, kind } = reference.data;
  let result =
    kind === 'video'
      ? await client.getSessionVideoRecordingUrl(sessionId)
      : kind === 'downloads'
        ? await client.getSessionDownloadsUrl(sessionId)
        : await client.getSessionRecordingUrl(sessionId);
  let url = result.url ?? (kind === 'downloads' ? result.downloadsUrl : result.recordingUrl);
  if (typeof url !== 'string' || !url) {
    throw createApiServiceError(
      `Hyperbrowser file is unavailable (status: ${result.status ?? 'unknown'}). Request it again when processing completes.`
    );
  }
  // The API supplies no URL expiry timestamp. Renew on every later download.
  return { url, expiresAt: new Date().toISOString() };
});
