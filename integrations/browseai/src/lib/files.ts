import { createApiServiceError } from 'slates';

let SIGNED_URL_REFRESH_MARGIN_MS = 60_000;
let UNKNOWN_EXPIRY_RECHECK_INTERVAL_MS = 60_000;

export let taskDataDownload = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError(
      'Browse AI returned an invalid task data download URL. Request the task again.'
    );
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw createApiServiceError('Browse AI returned an unsupported task data download URL.');
  }
  // A metadata read does not establish when an unsigned URL was issued. Recheck
  // it after one minute as a runtime policy, without asserting provider expiry
  // or that resolving the same URL again renews its lifetime.
  let refreshAt = Date.now() + UNKNOWN_EXPIRY_RECHECK_INTERVAL_MS;
  let signedDate = url.searchParams.get('X-Amz-Date');
  let signedSeconds = url.searchParams.get('X-Amz-Expires');
  if (
    signedDate &&
    /^\d{8}T\d{6}Z$/.test(signedDate) &&
    signedSeconds &&
    /^\d+$/.test(signedSeconds)
  ) {
    let date = `${signedDate.slice(0, 4)}-${signedDate.slice(4, 6)}-${signedDate.slice(6, 8)}T${signedDate.slice(9, 11)}:${signedDate.slice(11, 13)}:${signedDate.slice(13, 15)}Z`;
    let signedExpiry = Date.parse(date) + Number(signedSeconds) * 1000;
    if (Number.isFinite(signedExpiry)) {
      if (signedExpiry <= Date.now())
        throw createApiServiceError(
          'Browse AI returned an expired task data URL. Request the task again.'
        );
      refreshAt = signedExpiry - SIGNED_URL_REFRESH_MARGIN_MS;
    }
  }
  return { url: url.toString(), refreshAt: new Date(refreshAt).toISOString() };
};
