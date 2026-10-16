import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getDatasetFileExpiry, selectDatasetFile } from '../lib/dataset-files';
import { spec } from '../spec';

let referenceSchema = z.object({
  releaseId: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  datasetName: z.string().min(1),
  pathname: z.string().startsWith('/')
});

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = referenceSchema.safeParse(ctx.input.reference);
  if (!reference.success)
    throw createApiServiceError(
      'Invalid dataset file reference. Retrieve the dataset links again.'
    );
  let dataset = await new Client(ctx.auth).getDatasetDownloadLinks(
    reference.data.releaseId,
    reference.data.datasetName
  );
  let url = selectDatasetFile(dataset.files, reference.data.pathname);
  return { url: url.toString(), expiresAt: getDatasetFileExpiry(url) };
});
