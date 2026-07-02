import {
  buildApiServiceError,
  collectApiErrorDetails,
  createApiServiceError,
  isApiErrorRecord
} from 'slates';

let collectIfsDetails = (value: unknown, details: string[]) => {
  collectApiErrorDetails(value, details, {
    detailKeys: ['message', 'detail', 'error', 'error_description', 'code', 'reason', 'title'],
    nestedKeys: ['errors', 'details', 'innererror'],
    includeNumbers: true
  });
};

let extractODataMessage = (error: unknown) => {
  let details: string[] = [];
  let response = isApiErrorRecord(error) ? error.response : undefined;
  let responseData = isApiErrorRecord(response) ? response.data : undefined;

  collectIfsDetails(responseData, details);

  if (isApiErrorRecord(responseData)) {
    collectIfsDetails(responseData['odata.error'], details);
    collectIfsDetails(responseData.error, details);
  }

  if (details.length > 0) {
    let message = details.join(' - ');
    return message.includes('MI_MODIFIED_ERROR')
      ? `${message}. IFS returned MI_MODIFIED_ERROR; retry the request after the current modification completes.`
      : message;
  }

  return undefined;
};

let extractIfsCode = (value: unknown): string | undefined => {
  if (!isApiErrorRecord(value)) return undefined;

  for (let key of ['code', 'errorCode', 'error_code']) {
    let code = value[key];
    if (typeof code === 'string' || typeof code === 'number') return String(code);
  }

  let nested = value.error ?? value['odata.error'];
  return extractIfsCode(nested);
};

export let ifsApplicationsServiceError = (
  message: string,
  options: {
    reason?: string;
    upstreamStatus?: number | string;
    upstreamCode?: string;
    parent?: unknown;
  } = {}
) =>
  createApiServiceError(message, {
    reason: options.reason ?? 'ifs_applications_validation_error',
    upstreamStatus: options.upstreamStatus,
    upstreamCode: options.upstreamCode,
    parent: options.parent
  });

export let ifsApplicationsApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'IFS Cloud',
    reason: 'ifs_applications_api_error',
    operation,
    detailKeys: ['message', 'detail', 'error', 'error_description', 'code', 'reason', 'title'],
    nestedKeys: ['errors', 'details', 'innererror'],
    includeNumbers: true,
    extractMessage: extractODataMessage,
    extractUpstreamCode: (_error, response) => extractIfsCode(response?.data)
  });
