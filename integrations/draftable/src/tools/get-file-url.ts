import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { exportFileUrl, renewAt } from '../lib/files';
import { spec } from '../spec';

let referenceSchema = z.object({ exportIdentifier: z.string() });

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let parsed = referenceSchema.safeParse(ctx.input.reference);
  if (!parsed.success) {
    throw createApiServiceError('The export reference is invalid. Request the export again.');
  }
  let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
  let result = await client.getExport(parsed.data.exportIdentifier);
  return { url: exportFileUrl(result), expiresAt: renewAt() };
});
