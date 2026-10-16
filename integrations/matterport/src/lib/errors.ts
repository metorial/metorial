import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  getApiErrorResponseWithBody,
  isApiErrorRecord,
  pushBoundedApiErrorDetail,
  readApiErrorText,
  truncateApiErrorMessage
} from 'slates';

export let matterportError = (error: unknown, secrets: string[] = []) => {
  if (error instanceof ServiceError) return error;
  let response = getApiErrorResponseWithBody(error);
  let details: string[] = [];
  let collect = (value: unknown, depth = 0) => {
    if (depth > 4 || details.length >= 5) return;
    if (Array.isArray(value)) {
      for (let item of value.slice(0, 5)) collect(item, depth + 1);
    } else if (isApiErrorRecord(value)) {
      for (let key of ['message', 'error_description', 'error', 'detail', 'code']) {
        pushBoundedApiErrorDetail(details, value[key]);
      }
      collect(value.errors, depth + 1);
    } else {
      pushBoundedApiErrorDetail(details, value);
    }
  };
  collect(response?.data);
  let message =
    details.join('; ') ||
    readApiErrorText(error instanceof Error ? error.message : undefined) ||
    'The request could not be completed.';
  for (let secret of secrets.filter(Boolean).sort((a, b) => b.length - a.length)) {
    for (let variant of new Set([
      secret,
      encodeURIComponent(secret),
      new URLSearchParams({ value: secret }).toString().slice(6)
    ])) {
      message = message.split(variant).join('[redacted]');
    }
  }
  message = message
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9+/_=.-]+/gi, '$1 [redacted]')
    .replace(
      /((?:access_token|refresh_token|client_secret|token_secret|authorization|password)["']?\s*[:=]\s*["']?)[^\s"'&,;}]+/gi,
      '$1[redacted]'
    );
  return buildApiServiceError(
    {
      response: {
        status: response?.status,
        data: { message: truncateApiErrorMessage(message) }
      }
    },
    {
      providerLabel: 'Matterport',
      reason: 'matterport_api_error',
      extractUpstreamCode: () => {
        let body = response?.data;
        let firstError =
          isApiErrorRecord(body) && Array.isArray(body.errors) ? body.errors[0] : undefined;
        let extensions =
          isApiErrorRecord(firstError) && isApiErrorRecord(firstError.extensions)
            ? firstError.extensions
            : undefined;
        let code = isApiErrorRecord(body) ? (body.error ?? extensions?.code) : undefined;
        return typeof code === 'string' &&
          /^[a-z][a-z0-9_.-]{0,79}$/i.test(code) &&
          !secrets.some(secret => secret && code.includes(secret))
          ? code
          : undefined;
      }
    }
  );
};
