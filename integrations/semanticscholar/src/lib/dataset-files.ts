import { createApiServiceError } from 'slates';

export let parseDatasetFileUrl = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError('The selected dataset file URL is invalid.');
  }
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'ai2-s2ag.s3.amazonaws.com' ||
    url.username ||
    url.password ||
    url.port ||
    url.hash
  ) {
    throw createApiServiceError(
      'Only HTTPS dataset files on the documented ai2-s2ag.s3.amazonaws.com host can be prepared. The original provider links remain available.'
    );
  }
  return url;
};

let FILE_REFRESH_SAFETY_MARGIN_MS = 60_000;

export let getDatasetFileExpiry = (url: URL) => {
  let expires = url.searchParams.get('Expires');
  let timestamp: number | undefined;
  if (expires && /^\d+$/.test(expires)) timestamp = Number(expires) * 1000;
  let date = url.searchParams.get('X-Amz-Date');
  let duration = url.searchParams.get('X-Amz-Expires');
  if (date && duration && /^\d+$/.test(duration)) {
    let match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(date);
    if (match) {
      timestamp =
        Date.parse(
          `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`
        ) +
        Number(duration) * 1000;
    }
  }
  if (
    timestamp === undefined ||
    !Number.isFinite(timestamp) ||
    timestamp - FILE_REFRESH_SAFETY_MARGIN_MS <= Date.now() ||
    Number.isNaN(new Date(timestamp).getTime())
  ) {
    throw createApiServiceError(
      'The provider did not return a future signed expiry for this file. Request fresh dataset links and use the original provider URL.'
    );
  }
  return new Date(timestamp - FILE_REFRESH_SAFETY_MARGIN_MS).toISOString();
};

export let selectDatasetFile = (files: string[], pathname: string) => {
  let matches = files.filter(value => {
    try {
      let url = new URL(value);
      return url.hostname === 'ai2-s2ag.s3.amazonaws.com' && url.pathname === pathname;
    } catch {
      return false;
    }
  });
  if (matches.length !== 1) {
    throw createApiServiceError(
      'The selected dataset object is missing or ambiguous in this release. Retrieve the dataset file list and select a file again.'
    );
  }
  return parseDatasetFileUrl(matches[0]!);
};
