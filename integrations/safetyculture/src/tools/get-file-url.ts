import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { exportDownload } from '../lib/export';
import { spec } from '../spec';

let referenceSchema = z.object({ inspectionId: z.string(), format: z.enum(['pdf', 'word']) });
export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let parsed = referenceSchema.safeParse(ctx.input.reference);
  if (!parsed.success)
    throw createApiServiceError(
      'The inspection export reference is invalid. Export the inspection again.'
    );
  let { inspectionId, format } = parsed.data;
  let result = await new Client({ token: ctx.auth.token }).exportInspection(
    inspectionId,
    format
  );
  let download = exportDownload(result, inspectionId, format);
  if (!download)
    throw createApiServiceError(
      'The inspection export is still processing. Retry the download shortly.'
    );
  return {
    url: download.url,
    expiresAt: download.refreshAt ?? new Date(Date.now() + 300000).toISOString(),
    headers: {}
  };
});
