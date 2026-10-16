import { buildApiServiceError, createApiServiceError, isApiErrorRecord } from 'slates';
import type { z } from 'zod';

export let minerstatApiError = (error: unknown, secrets: string[]) => {
  let scrub = (text: string) => {
    for (let secret of secrets.filter(Boolean)) {
      for (let value of new Set([
        secret,
        encodeURIComponent(secret),
        new URLSearchParams({ value: secret }).toString().slice(6),
        JSON.stringify(secret).slice(1, -1)
      ])) {
        text = text.split(value).join('[redacted]');
      }
    }
    return text.replace(/Bearer\s+[^\s"'<>]+/gi, 'Bearer [redacted]');
  };

  return buildApiServiceError(error, {
    providerLabel: 'Minerstat',
    reason: 'minerstat_api_error',
    // Axios parents can contain the access key in the URL or token in headers.
    parent: { provider: 'Minerstat' },
    extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
    extractUpstreamCode: (_input, response, helpers) => {
      if (!helpers.isRecord(response?.data)) return undefined;
      let code = response.data.code;
      return typeof code === 'string' ? scrub(code) : undefined;
    },
    formatMessage: ({ providerLabel, statusLabel, message }) =>
      scrub(`${providerLabel} API request failed: ${statusLabel}${message}`)
  });
};

export let validateMinerstatResponse = (data: unknown, status: number, secrets: string[]) => {
  if (
    isApiErrorRecord(data) &&
    ((data.error !== undefined &&
      data.error !== null &&
      data.error !== false &&
      data.error !== '') ||
      (Array.isArray(data.errors) && data.errors.length > 0) ||
      data.success === false)
  ) {
    throw minerstatApiError({ response: { status, data } }, secrets);
  }
  if (data === null || data === undefined || typeof data !== 'object') {
    throw createApiServiceError(
      'Minerstat returned a malformed response. Expected a JSON object or array; retry or check the API availability.',
      { reason: 'minerstat_malformed_response', upstreamStatus: status }
    );
  }
};

export let parseMinerstatResponse = <T>(schema: z.ZodType<T>, data: unknown): T => {
  let parsed = schema.safeParse(data);
  if (!parsed.success) {
    let paths = parsed.error.issues.map(issue => issue.path.join('.') || 'response');
    throw createApiServiceError(
      `Minerstat returned a malformed response at ${paths.slice(0, 8).join(', ')}. Required data is missing or has an unexpected type; check the API response before retrying.`,
      { reason: 'minerstat_malformed_response' }
    );
  }
  return parsed.data;
};

export let requireMinerstatCredential = (value: string, label: string) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw createApiServiceError(`${label} is required. Update the connection credentials.`, {
      reason: 'minerstat_missing_credentials'
    });
  }
  return value.trim();
};

export let minerstatHistoryEntries = (data: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(data) && !isApiErrorRecord(data)) {
    throw createApiServiceError('Minerstat returned malformed historical data.', {
      reason: 'minerstat_malformed_response'
    });
  }
  let values = Array.isArray(data) ? data : Object.values(data);
  return values.map(value =>
    isApiErrorRecord(value) ? value : Array.isArray(value) ? { values: value } : { value }
  );
};

export let collectMinerstatRequestSecrets = (value: unknown, secrets: string[]) => {
  if (Array.isArray(value)) {
    for (let item of value) collectMinerstatRequestSecrets(item, secrets);
  } else if (isApiErrorRecord(value)) {
    for (let [key, item] of Object.entries(value)) {
      if (
        /^(password|token|bearerToken|accessKey|developerApiKey|api[_-]?key|authorization)$/i.test(
          key
        ) &&
        typeof item === 'string' &&
        item
      ) {
        secrets.push(item);
      } else if (typeof item === 'object' && item !== null) {
        collectMinerstatRequestSecrets(item, secrets);
      }
    }
  }
};
