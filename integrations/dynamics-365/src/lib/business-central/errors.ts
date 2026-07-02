import {
  buildApiServiceError,
  collectApiErrorDetails,
  createApiServiceError,
  isApiErrorRecord
} from 'slates';

export let businessCentralValidationError = (
  message: string,
  options: {
    reason?: string;
    upstreamStatus?: number | string;
    upstreamCode?: string;
    parent?: unknown;
  } = {}
) =>
  createApiServiceError(message, {
    reason: options.reason ?? 'business_central_validation_error',
    upstreamStatus: options.upstreamStatus,
    upstreamCode: options.upstreamCode,
    parent: options.parent
  });

let odataErrorRecord = (value: unknown) => {
  if (!isApiErrorRecord(value)) return undefined;
  let error = value.error;
  return isApiErrorRecord(error) ? error : undefined;
};

let collectODataDetails = (value: unknown) => {
  let details: string[] = [];
  let error = odataErrorRecord(value);

  if (error) {
    collectApiErrorDetails(error, details, {
      detailKeys: ['message', 'code', 'target'],
      nestedKeys: ['details', 'innererror', 'errors'],
      includeNumbers: true
    });
  }

  collectApiErrorDetails(value, details, {
    detailKeys: ['message', 'detail', 'error', 'error_description', 'code', 'target'],
    nestedKeys: ['details', 'errors'],
    includeNumbers: true
  });

  return details;
};

export let businessCentralApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Business Central',
    reason: 'business_central_api_error',
    operation,
    detailKeys: ['message', 'detail', 'error', 'error_description', 'code', 'target'],
    nestedKeys: ['details', 'errors', 'innererror'],
    extractMessage: (input, helpers) => {
      let response = helpers.getResponse(input);
      let details = collectODataDetails(response?.data);

      if (details.length > 0) {
        return details.join(' - ');
      }

      if (input instanceof Error && input.message) return input.message;
      return undefined;
    },
    extractUpstreamCode: (_input, response) => {
      let errorRecord = odataErrorRecord(response?.data);
      let code = errorRecord?.code;
      return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
    }
  });
