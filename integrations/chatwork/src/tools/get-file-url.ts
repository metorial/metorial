import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let fileReferenceSchema = z.object({ roomId: z.number(), fileId: z.number() });

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = fileReferenceSchema.safeParse(ctx.input.reference);
  if (!reference.success) {
    throw createApiServiceError('The file reference is invalid. Request the file again.');
  }

  let client = createClient(ctx.auth);
  let requestedAt = Date.now();
  let file = await client.getRoomFile(reference.data.roomId, reference.data.fileId);
  if (!file.download_url) {
    throw createApiServiceError(
      'Chatwork did not return a file download URL. Request the file again.'
    );
  }

  return {
    url: file.download_url,
    // Keep the same 10-second margin as the original download.
    expiresAt: new Date(requestedAt + 20_000).toISOString()
  };
});
