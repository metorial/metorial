import { createApiServiceError } from 'slates';

export type DownloadKind = 'upload' | 'headless';

export let getDownloadRefreshAt = (url: string) => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw createApiServiceError(
      'Dromo returned an invalid download URL. Request the file again.'
    );
  }
  if (parsed.protocol !== 'https:') {
    throw createApiServiceError(
      'Dromo returned an insecure download URL. Request the file again.'
    );
  }

  let date = parsed.searchParams.get('X-Amz-Date');
  let seconds = Number(parsed.searchParams.get('X-Amz-Expires'));
  let match = date?.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (match && Number.isFinite(seconds) && seconds > 0) {
    let issuedAt = Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6])
    );
    return new Date(issuedAt + seconds * 1000 - Math.min(60_000, seconds * 100)).toISOString();
  }
  // Renew unfamiliar signed URL formats promptly rather than assume a long lifetime.
  return new Date(Date.now() + 60_000).toISOString();
};

export let createDownloadAttachment = (url: string, kind: DownloadKind, id: string) => ({
  type: 'url' as const,
  url,
  mimeType: 'application/json',
  refreshReference: { kind, id },
  refreshAt: getDownloadRefreshAt(url)
});
