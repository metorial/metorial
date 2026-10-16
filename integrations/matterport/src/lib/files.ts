import { createApiServiceError } from 'slates';

export type FileReference =
  | { kind: 'floorplan'; modelId: string; path: string }
  | { kind: 'bundle'; modelId: string; bundleId: string; path: string }
  | {
      kind: 'panorama';
      modelId: string;
      locationId: string;
      panoramaId: string;
      resolution: string;
      faceIndex: number;
    };

export let filePath = (url: string) => {
  try {
    let parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol))
      throw createApiServiceError('Matterport returned an invalid download URL.');
    return parsed.pathname;
  } catch {
    throw createApiServiceError('Matterport returned an invalid download URL.');
  }
};

export let fileDelivery = (url: unknown, validUntil: unknown, reference: FileReference) => {
  if (typeof url !== 'string' || !url)
    throw createApiServiceError('Matterport returned an invalid download URL.');
  filePath(url);
  if (validUntil == null) return { type: 'url' as const, url };
  let expiry = typeof validUntil === 'string' ? Date.parse(validUntil) : Number.NaN;
  if (!Number.isFinite(expiry) || expiry <= Date.now())
    throw createApiServiceError(
      'Matterport returned an invalid or expired download link. Request the file again.'
    );
  return {
    type: 'url' as const,
    url,
    refreshReference: reference,
    refreshAt: new Date(Math.max(Date.now(), expiry - 30_000)).toISOString()
  };
};
