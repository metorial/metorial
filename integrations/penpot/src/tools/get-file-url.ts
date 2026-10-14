import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { makeClient } from '../lib/helpers';
import { spec } from '../spec';

let exportReferenceSchema = z.object({
  fileId: z.string(),
  includeLibraries: z.boolean(),
  embedAssets: z.boolean()
});

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = exportReferenceSchema.safeParse(ctx.input.reference);
  if (!reference.success) {
    throw createApiServiceError('The export reference is invalid. Export the file again.');
  }
  let { fileId, includeLibraries, embedAssets } = reference.data;
  let result = await makeClient(ctx).exportBinfile(fileId, includeLibraries, embedAssets);
  return {
    url: result.url,
    expiresAt: result.expiresAt,
    headers: { Authorization: `Token ${ctx.auth.token}` }
  };
});
