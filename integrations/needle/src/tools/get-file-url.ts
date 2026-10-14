import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { NeedleClient } from '../lib/client';
import { spec } from '../spec';

let referenceSchema = z.object({ fileId: z.string() });

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = referenceSchema.safeParse(ctx.input.reference);
  if (!reference.success) {
    throw createApiServiceError('The file reference is invalid. Request the file again.');
  }

  let client = new NeedleClient(ctx.auth.token);
  let url = await client.getDownloadUrl(reference.data.fileId);

  // Needle documents short-lived URLs but no expiry value. Reissue on every download.
  return { url, expiresAt: new Date().toISOString() };
});
