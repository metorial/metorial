import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { ImgixClient } from '../lib/client';
import { containsCredential } from '../lib/errors';
import { renderParams, renderUrl, sourceDomain, sourceSigningToken } from '../lib/render';
import { originPath, sourceId } from '../lib/schemas';
import { spec } from '../spec';
export const fileReference = z
  .object({
    sourceId,
    originPath,
    domain: z.string(),
    params: renderParams,
    validForSeconds: z.number().int().positive().safe(),
    accountId: z.string().optional()
  })
  .strict();
export const getFileUrl = getFileUrlTool(spec, async ctx => {
  const result = fileReference.safeParse(ctx.input.reference);
  if (!result.success)
    throw createApiServiceError('Invalid file reference. Request download_asset again.', {
      parent: {}
    });
  const reference = result.data,
    client = new ImgixClient(ctx.auth.token),
    source = (await client.getSource(reference.sourceId)).data;
  if (
    reference.accountId !== undefined &&
    source.relationships?.account.data.id !== reference.accountId
  )
    throw createApiServiceError(
      'The file source account changed. Request the file again with the correct connection.',
      { parent: {} }
    );
  if (
    !source.attributes.enabled ||
    source.attributes.deployment_status !== 'deployed' ||
    source.attributes.deployment?.type === 'webproxy'
  )
    throw createApiServiceError(
      'The file source must remain enabled, deployed, and a supported storage type. Request download_asset again.',
      { parent: {} }
    );
  const domain = sourceDomain(source, reference.domain);
  await client.getAsset(reference.sourceId, reference.originPath);
  const token = sourceSigningToken(source);
  if (!token)
    throw createApiServiceError(
      'The file source is no longer secured. Request download_asset again.',
      { parent: {} }
    );
  let prior: URL;
  try {
    prior = new URL(ctx.input.url);
  } catch {
    throw createApiServiceError('Invalid prior file URL.', { parent: {} });
  }
  const expected = new URL(renderUrl(domain, reference.originPath, reference.params));
  if (
    prior.protocol !== 'https:' ||
    prior.username ||
    prior.password ||
    prior.port ||
    prior.hash ||
    prior.hostname !== domain ||
    prior.pathname !== expected.pathname ||
    !/^\d+$/.test(prior.searchParams.get('expires') ?? '') ||
    !/^[a-f0-9]{32}$/.test(prior.searchParams.get('s') ?? '')
  )
    throw createApiServiceError(
      'The prior file URL does not match its exact source reference.',
      { parent: {} }
    );
  const actualParameters = Array.from(prior.searchParams.entries()).filter(
    ([key]) => key !== 's' && key !== 'expires'
  );
  if (
    JSON.stringify(actualParameters) !==
    JSON.stringify(Array.from(expected.searchParams.entries()))
  )
    throw createApiServiceError('The prior file parameters do not match the file reference.', {
      parent: {}
    });
  const expiresAt = Math.floor(Date.now() / 1000) + reference.validForSeconds;
  const url = renderUrl(domain, reference.originPath, reference.params, token, expiresAt);
  if (containsCredential(url, ctx.auth.token) || containsCredential(url, token))
    throw createApiServiceError(
      'The file URL reflects a credential. Request download_asset again with safe parameters.',
      { parent: {} }
    );
  return { url, expiresAt: new Date(expiresAt * 1000).toISOString(), headers: {}, query: {} };
});
