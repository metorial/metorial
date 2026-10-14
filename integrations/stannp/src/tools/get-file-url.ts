import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

let referenceSchema = z.object({ campaignId: z.number() });

// Campaign sample URLs last 30 minutes; renew five minutes before expiry.
export let getSampleRefreshAt = () => new Date(Date.now() + 25 * 60_000).toISOString();

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = referenceSchema.safeParse(ctx.input.reference);
  if (!reference.success) {
    throw createApiServiceError(
      'The campaign sample reference is invalid. Request the sample again.'
    );
  }
  let url = await createClient(ctx.auth, ctx.config).getCampaignSample(
    reference.data.campaignId
  );
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    throw createApiServiceError('Stannp did not return a campaign sample PDF URL.');
  }
  return { url, expiresAt: getSampleRefreshAt() };
});
