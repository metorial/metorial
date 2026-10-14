import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { getBatchDownload } from '../lib/batch-download';
import { Client } from '../lib/client';
import { spec } from '../spec';

let referenceSchema = z.object({ batchId: z.string().min(1) });

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = referenceSchema.safeParse(ctx.input.reference);
  if (!reference.success) {
    throw createApiServiceError(
      'The batch file reference is invalid. Request the batch results again.'
    );
  }
  let result = await new Client({ token: ctx.auth.token }).getBatchStatus({
    batchId: reference.data.batchId
  });
  let download = getBatchDownload(result);
  return { url: download.url, expiresAt: download.refreshAt };
});
