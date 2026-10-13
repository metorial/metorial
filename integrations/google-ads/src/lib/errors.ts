import { isApiErrorRecord } from 'slates';

type GoogleAdsErrorDetail = {
  code?: string;
  message?: string;
};

let readString = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

// errorCode is a oneof such as { queryError: 'UNRECOGNIZED_FIELD' }.
let readErrorCode = (value: unknown) => {
  if (!isApiErrorRecord(value)) return undefined;
  for (let code of Object.values(value)) {
    let text = readString(code);
    if (text) return text;
  }
  return undefined;
};

// Google Ads returns a generic top-level message ("Request contains an invalid
// argument.", "The caller does not have permission") and puts the actionable
// reason in error.details[].errors[] (GoogleAdsFailure).
let extractGoogleAdsFailure = (data: unknown) => {
  if (!isApiErrorRecord(data) || !isApiErrorRecord(data.error)) return undefined;

  let error = data.error;
  let details: GoogleAdsErrorDetail[] = [];
  let requestId: string | undefined;

  if (Array.isArray(error.details)) {
    for (let detail of error.details) {
      if (!isApiErrorRecord(detail)) continue;
      requestId ??= readString(detail.requestId);
      if (!Array.isArray(detail.errors)) continue;

      for (let item of detail.errors) {
        if (!isApiErrorRecord(item)) continue;
        let code = readErrorCode(item.errorCode);
        let message = readString(item.message);
        if (code || message) details.push({ code, message });
      }
    }
  }

  return {
    message: readString(error.message),
    details,
    requestId
  };
};

let LOGIN_CUSTOMER_ID_HINT =
  'If this account is managed through a manager (MCC) account, set or correct the Login Customer ID (the manager account ID, without hyphens) in the integration configuration.';

// Mutate and conversion-upload requests can return thousands of per-operation
// errors; keep the message bounded.
let MAX_REASONS = 5;
let MAX_REASONS_LENGTH = 1000;

let formatReasons = (details: GoogleAdsErrorDetail[]) => {
  let unique: string[] = [];
  for (let detail of details) {
    let reason =
      detail.code && detail.message
        ? `${detail.code}: ${detail.message}`
        : (detail.code ?? detail.message);
    if (reason && !unique.includes(reason)) unique.push(reason);
  }

  let shown = unique.slice(0, MAX_REASONS);
  let text = shown.join('; ');
  if (text.length > MAX_REASONS_LENGTH) {
    text = `${text.slice(0, MAX_REASONS_LENGTH - 3)}...`;
  }

  let more = unique.length - shown.length;
  return more > 0 ? `${text} (and ${more} more error${more === 1 ? '' : 's'})` : text;
};

export let mapGoogleAdsAxiosError = (error: { response?: { data?: unknown } }) => {
  let failure = extractGoogleAdsFailure(error.response?.data);
  if (!failure || failure.details.length === 0) return undefined;

  let summary =
    failure.message && !/[.!?]$/.test(failure.message)
      ? `${failure.message}.`
      : failure.message;
  let parts = [summary, formatReasons(failure.details)].filter(Boolean).join(' ');
  if (failure.details.some(detail => detail.code === 'USER_PERMISSION_DENIED')) {
    parts = `${parts} ${LOGIN_CUSTOMER_ID_HINT}`;
  }
  if (failure.requestId) {
    parts = `${parts} (Google Ads request ID: ${failure.requestId})`;
  }

  let code = failure.details.find(detail => detail.code)?.code;
  let upstream: { code?: string; requestId?: string } = {};
  if (code) upstream.code = code;
  if (failure.requestId) upstream.requestId = failure.requestId;

  return {
    message: parts,
    ...(Object.keys(upstream).length > 0 ? { upstream } : {})
  };
};
