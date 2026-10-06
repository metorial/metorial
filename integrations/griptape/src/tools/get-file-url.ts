import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

const referenceSchema = z.object({
  bucketId: z.string().min(1),
  assetName: z.string().min(1)
});

export const getFileUrl = getFileUrlTool(spec, async ctx => {
  const reference = referenceSchema.safeParse(ctx.input.reference);
  if (!reference.success)
    throw createApiServiceError('The file reference is invalid. Request the download again.');
  const client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
  return client.getAssetDownload(reference.data.bucketId, reference.data.assetName);
});
