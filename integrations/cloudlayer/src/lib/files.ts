import { createApiServiceError } from 'slates';
import type { Client } from './client';
import { assetOutput, responseItems, textValue } from './responses';

// Metadata rereads do not guarantee that storage will issue a fresh URL. Honor
// the documented SigV4 deadline; unknown expiry uses a runtime recheck policy.
export let renewAt = (url: string) => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw createApiServiceError(
      'Cloudlayer returned an invalid file URL. Request the file again.'
    );
  }
  let now = Date.now();
  let recheckAt = now + 15 * 60 * 1000;
  let signedAt = parsed.searchParams.get('X-Amz-Date');
  let lifetime = parsed.searchParams.get('X-Amz-Expires');
  if (signedAt !== null || lifetime !== null) {
    let isoDate = signedAt?.replace(
      /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
      '$1-$2-$3T$4:$5:$6.000Z'
    );
    let signedAtMs = isoDate === undefined ? Number.NaN : Date.parse(isoDate);
    let lifetimeSeconds = lifetime === null ? Number.NaN : Number(lifetime);
    if (
      !signedAt ||
      !/^\d{8}T\d{6}Z$/.test(signedAt) ||
      !Number.isFinite(signedAtMs) ||
      new Date(signedAtMs).toISOString() !== isoDate ||
      lifetime === null ||
      !/^\d+$/.test(lifetime) ||
      !Number.isSafeInteger(lifetimeSeconds) ||
      lifetimeSeconds < 1 ||
      lifetimeSeconds > 604800 ||
      parsed.searchParams.getAll('X-Amz-Date').length !== 1 ||
      parsed.searchParams.getAll('X-Amz-Expires').length !== 1
    ) {
      throw createApiServiceError(
        'Cloudlayer returned invalid signed file URL timing. Request the file again.'
      );
    }
    let safeDeadline = signedAtMs + lifetimeSeconds * 1000 - 10 * 1000;
    if (safeDeadline <= now) {
      throw createApiServiceError(
        'Cloudlayer returned a file URL that has expired or is too close to expiration. Request the file again or check its storage configuration.'
      );
    }
    recheckAt = Math.min(recheckAt, safeDeadline);
  }
  return new Date(recheckAt).toISOString();
};

type FileContext = {
  addAttachment: (file: {
    type: 'url';
    url: string;
    mimeType?: string;
    refreshReference: Record<string, string>;
    refreshAt: string;
  }) => Promise<unknown>;
};

export let attachAsset = async (ctx: FileContext, result: Record<string, unknown>) => {
  let asset = assetOutput(result);
  let url = textValue(result.url);
  if (!url) return;
  await ctx.addAttachment({
    type: 'url',
    url,
    mimeType: textValue(result.type),
    refreshReference: { assetId: asset.assetId },
    refreshAt: renewAt(url)
  });
};

export let attachJobFile = async (ctx: FileContext, result: Record<string, unknown>) => {
  let url = textValue(result.assetUrl, result.url);
  if (!url) return;
  let jobId = textValue(result.jobId, result.id);
  if (!jobId)
    throw createApiServiceError(
      'Cloudlayer returned a file URL without a job ID. Retrieve the file using get_asset.'
    );
  await ctx.addAttachment({
    type: 'url',
    url,
    refreshReference: { jobId },
    refreshAt: renewAt(url)
  });
};

export let findJobAsset = async (
  client: Client,
  jobId: string,
  maxPages: number,
  startAfterId?: string
) => {
  let cursor = startAfterId;
  let seen = new Set<string>();
  for (let page = 0; page < maxPages; page++) {
    let assets = responseItems(
      await client.listAssets({ limit: 100, startAfterId: cursor }),
      'assets'
    );
    let result = assets.find(asset => asset.jobId === jobId);
    if (result) return { asset: result, pages: page + 1, nextCursor: undefined };
    let last = assets.at(-1);
    let next = last && textValue(last.id, last.assetId);
    if (!next || next === cursor || seen.has(next))
      return { asset: undefined, pages: page + 1, nextCursor: undefined };
    seen.add(next);
    cursor = next;
  }
  return { asset: undefined, pages: maxPages, nextCursor: cursor };
};
