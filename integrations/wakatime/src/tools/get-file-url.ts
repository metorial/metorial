import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { WakaTimeClient } from '../lib/client';
import { spec } from '../spec';

let referenceSchema = z.object({ exportId: z.string().min(1) });

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = referenceSchema.safeParse(ctx.input.reference);
  if (!reference.success) {
    throw createApiServiceError('The export reference is invalid. List data exports again.');
  }

  let client = new WakaTimeClient(ctx.auth);
  let exports = await client.getDataExports();
  let dataExport = exports.find(item => item.id === reference.data.exportId);
  let expiresMs = dataExport?.expires ? Date.parse(dataExport.expires) : Number.NaN;
  if (
    !dataExport?.download_url ||
    dataExport.percent_complete !== 100 ||
    !Number.isFinite(expiresMs) ||
    expiresMs <= Date.now()
  ) {
    throw createApiServiceError(
      'This export is unavailable or expired. Request a new data export.'
    );
  }

  return {
    url: dataExport.download_url,
    expiresAt: new Date(expiresMs).toISOString()
  };
});
