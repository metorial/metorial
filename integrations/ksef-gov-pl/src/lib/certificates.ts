import { KsefClient } from './client';
import type { KsefEnvironment } from './environments';
import { getKsefUpstreamCodes, ksefValidationError } from './errors';

export type KsefCertificateUsage = 'KsefTokenEncryption' | 'SymmetricKeyEncryption';

export type KsefPublicCertificate = {
  certificate: string;
  certificateId: string;
  publicKeyId: string;
  validFrom: string;
  validTo: string;
  usage: KsefCertificateUsage[];
};

type CachedCertificate = { certificate: KsefPublicCertificate; expiresAt: number };
const cache = new Map<string, CachedCertificate>();
const inFlight = new Map<string, Promise<KsefPublicCertificate>>();
const MAX_CACHE_MS = 60 * 60 * 1000;

function isCertificate(value: unknown): value is KsefPublicCertificate {
  if (!value || typeof value !== 'object') return false;
  const certificate = value as Record<string, unknown>;
  return (
    typeof certificate.certificate === 'string' &&
    typeof certificate.certificateId === 'string' &&
    typeof certificate.publicKeyId === 'string' &&
    typeof certificate.validFrom === 'string' &&
    typeof certificate.validTo === 'string' &&
    Array.isArray(certificate.usage) &&
    certificate.usage.every(item => typeof item === 'string')
  );
}

async function loadCertificate(
  environment: KsefEnvironment,
  usage: KsefCertificateUsage
): Promise<KsefPublicCertificate> {
  const client = new KsefClient({ token: '', environment });
  const response = await client.request<unknown>(
    'get encryption certificates',
    'GET',
    '/security/public-key-certificates'
  );
  if (!Array.isArray(response)) {
    throw ksefValidationError('KSeF returned an invalid certificate list.');
  }

  const now = Date.now();
  const certificates = response
    .filter(isCertificate)
    .filter(
      certificate =>
        certificate.usage.includes(usage) &&
        Date.parse(certificate.validFrom) <= now &&
        Date.parse(certificate.validTo) > now + 60_000
    )
    .sort((left, right) => Date.parse(right.validFrom) - Date.parse(left.validFrom));
  const certificate = certificates[0];
  if (!certificate) {
    throw ksefValidationError(`KSeF has no active ${usage} certificate for ${environment}.`);
  }
  cache.set(`${environment}:${usage}`, {
    certificate,
    expiresAt: Math.min(now + MAX_CACHE_MS, Date.parse(certificate.validTo) - 60_000)
  });
  return certificate;
}

export async function getPublicCertificate(
  environment: KsefEnvironment,
  usage: KsefCertificateUsage,
  forceRefresh = false
): Promise<KsefPublicCertificate> {
  const key = `${environment}:${usage}`;
  if (forceRefresh) cache.delete(key);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.certificate;

  const existing = inFlight.get(key);
  if (existing && !forceRefresh) return existing;
  const pending = loadCertificate(environment, usage);
  inFlight.set(key, pending);
  try {
    return await pending;
  } finally {
    if (inFlight.get(key) === pending) inFlight.delete(key);
  }
}

export function isRetiredCertificateError(error: unknown): boolean {
  return getKsefUpstreamCodes(error).includes('21470');
}
