import { createHash } from 'node:crypto';
import { createApiServiceError } from 'slates';
import { z } from 'zod';
import type { sourceResource } from './schemas';
import { encodePart, hasControl, publicUrl, rawPath, validDomain } from './validation';
export const renderParams = z.record(z.string(), z.string());
export const expiry = z
  .number()
  .int()
  .nonnegative()
  .safe()
  .optional()
  .describe(
    'Optional future Unix timestamp in seconds; this value becomes the signed expires parameter.'
  );
export function encodedRenderPath(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    publicUrl(path);
    return `/${encodePart(path)}`;
  }
  return `/${rawPath(path).split('/').map(encodePart).join('/')}`;
}
export function renderUrl(
  domain: string,
  path: string,
  params: Record<string, string> = {},
  token?: string,
  expiresAt?: number
): string {
  const host = validDomain(domain),
    encoded = encodedRenderPath(path);
  if (
    Object.keys(params).some(key => !key || hasControl(key)) ||
    (params.s !== undefined && (token !== undefined || !/^[a-f0-9]{32}$/.test(params.s))) ||
    (params.expires !== undefined &&
      (expiresAt !== undefined || !/^\d+$/.test(params.expires)))
  )
    throw createApiServiceError(
      'Use valid parameter names, one expiry value, and no precomputed signature when signing.',
      { parent: {} }
    );
  const effectiveExpiry =
    expiresAt ?? (params.expires === undefined ? undefined : Number(params.expires));
  if (
    effectiveExpiry !== undefined &&
    (!Number.isSafeInteger(effectiveExpiry) ||
      effectiveExpiry * 1000 <= Date.now() ||
      !Number.isFinite(new Date(effectiveExpiry * 1000).getTime()))
  )
    throw createApiServiceError(
      'expiresAt must be a future, representable Unix timestamp in seconds.',
      { parent: {} }
    );
  const parts = Object.entries(params)
    .filter(([key]) => key !== 's')
    .map(
      ([key, value]) =>
        `${encodePart(key)}=${encodePart(key.endsWith('64') ? Buffer.from(value, 'utf8').toString('base64url') : value)}`
    );
  if (expiresAt !== undefined) parts.push(`expires=${expiresAt}`);
  const query = parts.length ? `?${parts.join('&')}` : '';
  if (token !== undefined) {
    if (!token || hasControl(token))
      throw createApiServiceError('A valid source signing token is required.', { parent: {} });
    const signature = createHash('md5')
      .update(token + encoded + query)
      .digest('hex');
    return `https://${host}${encoded}${query}${query ? '&' : '?'}s=${signature}`;
  }
  return `https://${host}${encoded}${query}${params.s === undefined ? '' : `${query ? '&' : '?'}s=${params.s}`}`;
}
export function sourceDomain(
  source: z.infer<typeof sourceResource>,
  requested?: string
): string {
  const deployment = source.attributes.deployment;
  if (!deployment)
    throw createApiServiceError('Source deployment configuration is unavailable.', {
      parent: {}
    });
  const allowed = [
    ...(deployment.imgix_subdomains ?? []).map(value => `${value}.imgix.net`),
    ...(deployment.custom_domains ?? [])
  ].map(validDomain);
  const domain = requested === undefined ? allowed[0] : validDomain(requested);
  if (!domain || !allowed.includes(domain))
    throw createApiServiceError('Use a domain currently assigned to this exact source.', {
      parent: {}
    });
  return domain;
}
export function sourceSigningToken(
  source: z.infer<typeof sourceResource>
): string | undefined {
  if (source.attributes.deployment?.secure_url_enabled === undefined)
    throw createApiServiceError(
      'Source security state is missing; a safe rendering URL cannot be inferred.',
      { parent: {} }
    );
  if (!source.attributes.deployment.secure_url_enabled) return undefined;
  const token = source.attributes.secure_url_token;
  if (!token)
    throw createApiServiceError(
      'The secured source did not return its signing token. Check Sources permission.',
      { parent: {} }
    );
  return token;
}
