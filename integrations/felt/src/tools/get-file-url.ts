import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let referenceSchema = z.object({ mapId: z.string(), layerId: z.string() });

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = referenceSchema.safeParse(ctx.input.reference);
  if (!reference.success) {
    throw createApiServiceError(
      'The layer export reference is invalid. Export the layer again.'
    );
  }
  let client = new Client({ token: ctx.auth.token });
  let result = await client.getLayerExportLink(reference.data.mapId, reference.data.layerId);
  if (!result.export_link) {
    throw createApiServiceError(
      'Felt did not return a layer export link. Export the layer again.'
    );
  }
  // Renew for every later download because Felt does not publish the link lifetime.
  return { url: result.export_link, expiresAt: new Date().toISOString() };
});
