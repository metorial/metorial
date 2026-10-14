import { createApiServiceError } from 'slates';

export let exportDownload = (result: any, inspectionId: string, format: 'pdf' | 'word') => {
  if (result.status === 'STATUS_FAILED') {
    throw createApiServiceError(
      'SafetyCulture could not export this inspection. Ensure its media has synced and retry the export.'
    );
  }
  let exportUrl = result.url || result.download_url;
  if (!exportUrl || (result.status && result.status !== 'STATUS_DONE')) return undefined;
  let url: URL;
  try {
    url = new URL(exportUrl);
  } catch {
    throw createApiServiceError(
      'SafetyCulture returned an invalid export download URL. Retry the export.'
    );
  }
  if (url.protocol !== 'https:')
    throw createApiServiceError(
      'SafetyCulture returned an insecure export download URL. Retry the export.'
    );
  let signedAt = url.searchParams.get('X-Amz-Date');
  let duration = Number(url.searchParams.get('X-Amz-Expires'));
  let expiresAt: Date | undefined;
  if (
    signedAt &&
    /^\d{8}T\d{6}Z$/.test(signedAt) &&
    Number.isFinite(duration) &&
    duration > 0
  ) {
    let timestamp = `${signedAt.slice(0, 4)}-${signedAt.slice(4, 6)}-${signedAt.slice(6, 8)}T${signedAt.slice(9, 11)}:${signedAt.slice(11, 13)}:${signedAt.slice(13, 15)}Z`;
    let issuedAt = new Date(timestamp).getTime();
    if (Number.isFinite(issuedAt)) expiresAt = new Date(issuedAt + duration * 1000);
  }
  if (!expiresAt) {
    let legacyExpiry = Number(url.searchParams.get('Expires'));
    if (Number.isFinite(legacyExpiry) && legacyExpiry > 0)
      expiresAt = new Date(legacyExpiry * 1000);
  }
  return {
    url: url.toString(),
    filename: `inspection-${inspectionId}.${format === 'word' ? 'docx' : 'pdf'}`,
    mimeType:
      format === 'word'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf',
    expiresAt: expiresAt?.toISOString(),
    refreshAt: expiresAt
      ? new Date(Math.max(Date.now(), expiresAt.getTime() - 60000)).toISOString()
      : undefined
  };
};
