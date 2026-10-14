import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { Client, transcriptUrlRefreshIntervalMs } from '../lib/client';
import { spec } from '../spec';

let referenceSchema = z.object({ sessionUuid: z.string().min(1) });

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = referenceSchema.safeParse(ctx.input.reference);
  if (!reference.success) {
    throw createApiServiceError(
      'The transcript reference is invalid. Request the transcript again.'
    );
  }
  let client = new Client({ token: ctx.auth.token });
  let transcript = await client.getTranscript(reference.data.sessionUuid);
  return {
    url: transcript.transcriptionUrl,
    expiresAt: new Date(Date.now() + transcriptUrlRefreshIntervalMs).toISOString()
  };
});
