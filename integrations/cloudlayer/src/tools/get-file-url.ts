import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { findJobAsset, renewAt } from '../lib/files';
import { requiredText, textValue } from '../lib/responses';
import { spec } from '../spec';

let referenceSchema = z.object({
  assetId: z.string().min(1).optional(),
  jobId: z.string().min(1).optional()
});

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let parsed = referenceSchema.safeParse(ctx.input.reference);
  if (!parsed.success || Boolean(parsed.data.assetId) === Boolean(parsed.data.jobId))
    throw createApiServiceError('The file reference is invalid. Request the file again.');
  let client = new Client(ctx.auth);
  let url: string | undefined;
  if (parsed.data.assetId) {
    url = textValue((await client.getAsset(parsed.data.assetId)).url);
  } else if (parsed.data.jobId) {
    let job = await client.getJob(parsed.data.jobId);
    url = textValue(job.assetUrl, job.url);
    if (!url) {
      let found = await findJobAsset(client, requiredText('job ID', job.id, job.jobId), 3);
      url = found.asset && textValue(found.asset.url);
    }
  }
  if (!url)
    throw createApiServiceError(
      'Cloudlayer did not return a current file URL. Request the asset again with get_asset, or check the account storage retention.'
    );
  return { url, expiresAt: renewAt(url) };
});
