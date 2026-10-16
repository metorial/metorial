import { buildApiServiceError, isApiErrorRecord } from 'slates';

let findCode = (value: unknown): string | undefined => {
  if (Array.isArray(value)) return value.map(findCode).find(code => code !== undefined);
  if (!isApiErrorRecord(value)) return undefined;
  for (let key of ['code', 'error_code', 'error']) {
    let code = value[key];
    if (typeof code === 'string' && code.trim()) return code;
  }
  return (
    findCode(value.errors) ??
    (isApiErrorRecord(value.error) ? findCode(value.error) : undefined)
  );
};

export let nusiiApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Nusii',
    reason: 'nusii_api_error',
    operation,
    extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
    extractMessage: (error, helpers) => {
      let response = helpers.getResponseWithBody(error);
      let details: string[] = [];
      helpers.collectDetails(response?.data, details, {
        detailKeys: ['message', 'detail', 'title', 'error', 'error_description', 'code'],
        nestedKeys: ['errors', 'error']
      });
      let body = response?.data;
      if (isApiErrorRecord(body) && isApiErrorRecord(body.errors)) {
        for (let [field, value] of Object.entries(body.errors)) {
          let messages: string[] = [];
          helpers.collectDetails(value, messages);
          if (messages.length) details.push(`${field}: ${messages.join(', ')}`);
        }
      }
      return details.length ? details.slice(0, 5).join(' - ') : helpers.extractMessage(error);
    },
    extractUpstreamCode: (error, response) => {
      let code = findCode(response?.data);
      if (code) return code;
      if (
        !isApiErrorRecord(error) ||
        !isApiErrorRecord(error.data) ||
        !isApiErrorRecord(error.data.upstream)
      )
        return undefined;
      let upstreamCode = error.data.upstream.code;
      return typeof upstreamCode === 'string' ? upstreamCode : undefined;
    }
  });
