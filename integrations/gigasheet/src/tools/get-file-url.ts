import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { GigasheetClient } from '../lib/client';
import { getExportDownload } from '../lib/files';
import { spec } from '../spec';

let referenceSchema = z.object({ exportHandle: z.string().min(1) });

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = referenceSchema.safeParse(ctx.input.reference);
  if (!reference.success)
    throw createApiServiceError(
      'Invalid export reference. Request the export download again.'
    );
  let result = await new GigasheetClient({ token: ctx.auth.token }).downloadExport(
    '',
    reference.data.exportHandle
  );
  return getExportDownload(result);
});
