import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let referenceSchema = z.object({
  jobId: z.string(),
  type: z.enum(['result', 'logs']).optional(),
  collection: z.number().optional(),
  modified: z.number().optional(),
  filename: z.string().optional()
});

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = referenceSchema.safeParse(ctx.input.reference);
  if (!reference.success) {
    throw createApiServiceError('The export reference is invalid. Request the export again.');
  }
  let { jobId, ...params } = reference.data;
  let download = await new Client({ token: ctx.auth.token }).getExportDownload(jobId, params);
  return { url: download.url, expiresAt: new Date().toISOString() };
});
