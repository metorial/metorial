import { buildApiServiceError } from 'slates';

export let linkhutApiError = (error: unknown, secrets: string[], operation = 'request') => {
  let scrub = (text: string) => {
    for (let secret of secrets.filter(Boolean)) {
      for (let value of new Set([
        secret,
        encodeURIComponent(secret),
        new URLSearchParams({ value: secret }).toString().slice(6)
      ])) {
        text = text.split(value).join('[redacted]');
      }
    }
    return text.replace(/Bearer\s+[^\s"'<>]+/gi, 'Bearer [redacted]');
  };

  return buildApiServiceError(error, {
    providerLabel: 'Linkhut',
    reason: 'linkhut_api_error',
    operation,
    // Do not attach an Axios parent containing OAuth form credentials or auth headers.
    parent: { provider: 'Linkhut' },
    detailKeys: ['message', 'detail', 'error', 'error_description', 'result_code'],
    extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
    extractUpstreamCode: (_input, response, helpers) => {
      if (!helpers.isRecord(response?.data)) return undefined;
      let code = response.data.result_code ?? response.data.error;
      return typeof code === 'string' ? scrub(code) : undefined;
    },
    formatMessage: ({ providerLabel, operation, statusLabel, message, status }) =>
      scrub(
        `${providerLabel} API ${operation} failed: ${statusLabel}${message}${[429, 500, 999].includes(Number(status)) ? ' Wait before retrying; the service may have throttled requests.' : ''}`
      )
  });
};
