import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { fileDelivery, filePath } from '../lib/files';
import { spec } from '../spec';

let referenceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('floorplan'), modelId: z.string(), path: z.string() }),
  z.object({
    kind: z.literal('bundle'),
    modelId: z.string(),
    bundleId: z.string(),
    path: z.string()
  }),
  z.object({
    kind: z.literal('panorama'),
    modelId: z.string(),
    locationId: z.string(),
    panoramaId: z.string(),
    resolution: z.enum(['512', '1k', '2k', '4k']),
    faceIndex: z.number().int().min(0).max(5)
  })
]);

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let parsed = referenceSchema.safeParse(ctx.input.reference);
  if (!parsed.success)
    throw createApiServiceError('The file reference is invalid. Request the file again.');
  let reference = parsed.data;
  let client = new Client(ctx.auth);
  let file: { url?: unknown; validUntil?: unknown } | undefined;
  if (reference.kind === 'floorplan') {
    let files = await client.getFloorplans(reference.modelId);
    file = files.find(
      item => typeof item.url === 'string' && filePath(item.url) === reference.path
    );
  } else if (reference.kind === 'bundle') {
    let bundles = await client.getAssetBundles(reference.modelId);
    file = bundles
      .find(item => item.id === reference.bundleId)
      ?.assets?.find(
        (item: any) => typeof item.url === 'string' && filePath(item.url) === reference.path
      );
  } else {
    let locations = await client.getSweeps(reference.modelId, reference.resolution);
    let panorama = locations
      .find(item => item.id === reference.locationId)
      ?.panos.find((item: any) => item.id === reference.panoramaId);
    file = {
      url: panorama?.skybox?.children?.[reference.faceIndex],
      validUntil: panorama?.skybox?.validUntil
    };
  }
  if (!file)
    throw createApiServiceError(
      'The requested Matterport file is no longer available. Request the file again.'
    );
  let delivery = fileDelivery(file.url, file.validUntil, reference);
  if (!delivery.refreshAt)
    throw createApiServiceError(
      'Matterport did not provide an expiry for the renewed download link. Request the file again.'
    );
  return { url: delivery.url, expiresAt: delivery.refreshAt };
});
