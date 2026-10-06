import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { accountId, resolveRegion, StitchConnectClient } from '../lib/client';
import { spec } from '../spec';

const referenceSchema = z.object({
  jobName: z.string().min(1),
  clientId: z.string(),
  region: z.enum(['us', 'eu'])
});
export const getFileUrl = getFileUrlTool(spec, async ctx => {
  const result = referenceSchema.safeParse(ctx.input.reference);
  if (
    !result.success ||
    result.data.region !== resolveRegion(ctx.auth.region, ctx.config) ||
    result.data.clientId !== accountId(ctx.auth.clientId ?? ctx.config.clientId)
  )
    throw createApiServiceError(
      'This log reference does not match the configured Stitch account and region. Request the logs again.'
    );
  const file = await new StitchConnectClient({
    token: ctx.auth.token,
    region: resolveRegion(ctx.auth.region, ctx.config),
    clientId: result.data.clientId
  }).getExtractionLogs(result.data.jobName);
  return { url: file.url, expiresAt: file.expiresAt, headers: {}, query: {} };
});
