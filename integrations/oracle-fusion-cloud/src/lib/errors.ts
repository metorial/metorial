import {
  AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX,
  AuthConfigSecretRedactor,
  buildApiServiceError,
  isApiErrorRecord
} from 'slates';

let genericMessage = (status: number) => {
  if (status === 401) return 'Authentication failed. Reconnect the Oracle Fusion account.';
  if (status === 403)
    return 'Access was denied. Check the granted scope and Oracle application roles.';
  if (status === 404)
    return 'The resource was not found or is not accessible to this account.';
  if (status === 409 || status === 412)
    return 'The resource changed or conflicts with the requested operation. Retrieve it again before retrying.';
  if (status === 429) return 'The request rate limit was reached. Try again later.';
  if (status >= 500)
    return 'Oracle Fusion could not complete the request. Check the resource before retrying a change.';
  return 'The request could not be completed. Check the supplied values and Oracle application configuration.';
};

let formatError = ({
  operation,
  status,
  message
}: {
  operation: string;
  status?: string | number;
  message: string;
}) => {
  let httpStatus = Number(status);
  let statusLabel =
    Number.isInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599
      ? ` (HTTP ${httpStatus})`
      : '';
  return `Oracle Fusion ${operation} failed${statusLabel}. ${message}`;
};

let upstreamBody = (error: unknown) => {
  if (!isApiErrorRecord(error) || error.name !== 'SlateError' || !isApiErrorRecord(error.data))
    return undefined;
  let baggage = error.data.baggage;
  return isApiErrorRecord(baggage) ? baggage.response : undefined;
};

export let createOracleApiError = (secretValues: readonly string[] = []) => {
  let values = [
    ...new Set(
      secretValues.filter(Boolean).flatMap(value => [value, encodeURIComponent(value)])
    )
  ];
  let redactor = new AuthConfigSecretRedactor({ values });
  let sanitize = (message: string) => {
    let result = redactor.redactEmbedded(message);
    for (let index = values.length - 1; index >= 0; index--) {
      let marker = `${AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX}values.${index}`;
      result = result.replaceAll(`${marker}$$`, '[redacted]').replaceAll(marker, '[redacted]');
    }
    result = result
      .replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/-]+=*/gi, '[redacted]')
      .replace(
        /((?:access_token|refresh_token|client_secret|password|authorization)\s*[:=]\s*)(?:"[^"\n]*"|'[^'\n]*'|[^\s,;&]+)/gi,
        '$1[redacted]'
      );
    return [...result]
      .map(character =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 ? ' ' : character
      )
      .join('')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1200);
  };
  return (error: unknown, operation = 'request') =>
    buildApiServiceError(error, {
      providerLabel: 'Oracle Fusion',
      reason: 'oracle_fusion_api_error',
      operation,
      extractMessage: (input, helpers) => {
        let status = Number(helpers.getStatus(input));
        if (status === 401 || status === 403) return genericMessage(status);
        let details: string[] = [];
        helpers.collectDetails(
          helpers.getResponse(input)?.data ?? upstreamBody(input),
          details,
          {
            detailKeys: ['title', 'detail', 'message', 'error', 'o:errorCode', 'code'],
            nestedKeys: ['o:errorDetails', 'errorDetails', 'errors'],
            includeNumbers: false
          }
        );
        let providerDetails = details
          .filter(detail => !/^\s*</.test(detail))
          .slice(0, 8)
          .map(sanitize)
          .filter(Boolean);
        return providerDetails.length ? providerDetails.join(' - ') : genericMessage(status);
      },
      extractUpstreamCode: (input, response) => {
        let body = response?.data ?? upstreamBody(input);
        if (!isApiErrorRecord(body)) return undefined;
        let code = body['o:errorCode'] ?? body.code;
        return typeof code === 'string' && /^[A-Za-z0-9_.:-]{1,80}$/.test(code)
          ? sanitize(code)
          : undefined;
      },
      formatMessage: formatError
    });
};

export let oracleOAuthError = (error: unknown, operation = 'OAuth request') =>
  buildApiServiceError(error, {
    providerLabel: 'Oracle identity domain',
    reason: 'oracle_fusion_oauth_error',
    operation,
    extractMessage: (_input, helpers) => genericMessage(Number(helpers.getStatus(_input))),
    formatMessage: formatError
  });
