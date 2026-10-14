import { createApiServiceError, isApiErrorRecord } from 'slates';

export let normalizeLibraryEntry = (value: unknown) => {
  if (!isApiErrorRecord(value))
    throw createApiServiceError('Gigasheet returned an invalid library entry.');
  let metadata = isApiErrorRecord(value.metadata) ? value.metadata : value;
  let text = (key: string, fallback: string) =>
    typeof value[key] === 'string'
      ? value[key]
      : typeof metadata[fallback] === 'string'
        ? metadata[fallback]
        : undefined;
  let numeric = (key: string, fallback: string) =>
    typeof value[key] === 'number'
      ? value[key]
      : typeof metadata[fallback] === 'number'
        ? metadata[fallback]
        : undefined;
  return {
    ...value,
    handle: text('handle', 'FileUuid'),
    name: text('name', 'FileName'),
    type:
      typeof value.type === 'string'
        ? value.type
        : metadata.IsDirectory === true
          ? 'directory'
          : 'file',
    rowCount: numeric('rowCount', 'FileRows'),
    columnCount:
      typeof value.columnCount === 'number'
        ? value.columnCount
        : Array.isArray(metadata.Headers)
          ? metadata.Headers.length
          : undefined,
    createdAt: text('createdAt', 'CreatedAt'),
    updatedAt: text('updatedAt', 'LastUpdated'),
    state: text('state', 'Status'),
    size: typeof value.size === 'number' ? value.size : undefined
  };
};

export let getExportDownload = (result: Record<string, unknown>) => {
  if (typeof result.error === 'string' && result.error.trim())
    throw createApiServiceError(`Gigasheet export download failed: ${result.error}`);
  let rawUrl = result.presignedUrl ?? result.url;
  let parsed = typeof rawUrl === 'string' ? URL.parse(rawUrl) : null;
  if (!parsed || parsed.protocol !== 'https:')
    throw createApiServiceError(
      'Gigasheet did not return a valid export download URL. Check the export status and retry when processed.'
    );
  let timestamp = parsed.searchParams.get('X-Amz-Date');
  let duration = parsed.searchParams.get('X-Amz-Expires');
  let legacy = parsed.searchParams.get('Expires');
  let expires: number | undefined;
  if (
    timestamp &&
    /^\d{8}T\d{6}Z$/.test(timestamp) &&
    duration &&
    /^\d+$/.test(duration) &&
    Number.isSafeInteger(Number(duration))
  ) {
    let iso = `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}T${timestamp.slice(9, 11)}:${timestamp.slice(11, 13)}:${timestamp.slice(13, 15)}Z`;
    let start = Date.parse(iso);
    if (
      Number.isFinite(start) &&
      new Date(start).toISOString().slice(0, 19) === iso.slice(0, 19)
    )
      expires = start + Number(duration) * 1000;
  } else if (legacy && /^\d+$/.test(legacy) && Number.isSafeInteger(Number(legacy))) {
    expires = Number(legacy) * 1000;
  }
  if (
    expires === undefined ||
    !Number.isFinite(expires) ||
    !Number.isFinite(new Date(expires).getTime())
  )
    throw createApiServiceError(
      'The export download URL has no usable future expiry. Request a new download URL.'
    );
  let remainingLifetimeMs = expires - Date.now();
  if (remainingLifetimeMs <= 30_000) {
    throw createApiServiceError(
      'The export download URL expires too soon. Request a new download URL.'
    );
  }
  // The hub uses expiresAt as its next renewal time, rather than the S3 deadline.
  let renewalMarginMs = Math.min(60_000, Math.floor(remainingLifetimeMs / 2));
  return {
    url: parsed.toString(),
    expiresAt: new Date(expires - renewalMarginMs).toISOString()
  };
};
