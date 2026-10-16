import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let referenceSchema = z.object({ fileUid: z.string().min(1) });

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = referenceSchema.safeParse(ctx.input.reference);
  if (!reference.success) {
    throw createApiServiceError('The file reference is invalid. Retrieve the file again.');
  }
  let client = new Client({ token: ctx.auth.token });
  let download = await client.getFileDownload(reference.data.fileUid);
  return { url: download.url, expiresAt: download.expiresAt };
});
