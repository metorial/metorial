import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { DromoClient } from '../lib/client';
import { getDownloadRefreshAt } from '../lib/files';
import { spec } from '../spec';

let referenceSchema = z.object({
  kind: z.enum(['upload', 'headless']),
  id: z.string().min(1)
});

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = referenceSchema.safeParse(ctx.input.reference);
  if (!reference.success) {
    throw createApiServiceError('The file reference is invalid. Request the results again.');
  }
  let client = new DromoClient({ token: ctx.auth.token });
  let { kind, id } = reference.data;
  let { url } =
    kind === 'upload'
      ? await client.getUploadDownloadUrl(id)
      : await client.getHeadlessImportDownloadUrl(id);
  return { url, expiresAt: getDownloadRefreshAt(url) };
});
