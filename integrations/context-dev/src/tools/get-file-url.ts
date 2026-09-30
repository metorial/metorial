import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { ContextClient, pathId } from '../lib/client';
import { batchFileKey } from '../lib/files';
import { spec } from '../spec';

const referenceSchema = z.object({
  type: z.literal('batch-result'),
  batchId: z.string().min(1),
  fileKey: z.string().min(1)
});

export const getFileUrl = getFileUrlTool(spec, async ctx => {
  const reference = referenceSchema.safeParse(ctx.input.reference);
  if (!reference.success) {
    throw createApiServiceError('The file reference is invalid. Request the batch again.');
  }
  const batch = await new ContextClient(ctx.auth.token).request('refresh batch result file', {
    method: 'GET',
    path: `/batch/${pathId(reference.data.batchId)}`
  });
  const results = batch.results;
  const file = Array.isArray(results?.files)
    ? results.files.find(
        (item: { url: string }) => batchFileKey(item.url) === reference.data.fileKey
      )
    : undefined;
  if (
    !file ||
    typeof results.expires_at !== 'string' ||
    !Number.isFinite(Date.parse(results.expires_at)) ||
    Date.parse(results.expires_at) <= Date.now()
  ) {
    throw createApiServiceError(
      'This batch result file is no longer available. Request the batch again.'
    );
  }
  return { url: file.url, expiresAt: results.expires_at, headers: {}, query: {} };
});
