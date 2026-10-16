import {
  buildApiServiceError,
  collectApiErrorDetails,
  createApiServiceError,
  isApiErrorRecord
} from 'slates';

let errorMessage = (body: unknown) => {
  let details: string[] = [];
  if (isApiErrorRecord(body) && isApiErrorRecord(body.errors)) {
    for (let [field, value] of Object.entries(body.errors)) {
      let messages: string[] = [];
      collectApiErrorDetails(value, messages);
      if (messages.length) details.push(`${field}: ${messages.join(' - ')}`);
    }
  }
  collectApiErrorDetails(body, details);
  return details.length ? details.slice(0, 5).join(' - ').slice(0, 1000) : undefined;
};

export let toSplitwiseError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Splitwise',
    reason: 'splitwise_api_error',
    operation,
    extractResponse: (value, helpers) => helpers.getResponseWithBody(value),
    extractMessage: (value, helpers) => errorMessage(helpers.getResponseWithBody(value)?.data)
  });

export let checkResponse = (body: unknown, upstreamStatus?: number) => {
  if (!isApiErrorRecord(body)) {
    throw createApiServiceError('Splitwise returned an invalid JSON response.');
  }
  let errors = body.errors;
  let hasErrors =
    Array.isArray(errors) || isApiErrorRecord(errors)
      ? Object.keys(errors).length > 0
      : typeof errors === 'string' && errors.length > 0;
  if (hasErrors || body.success === false || body.error) {
    throw createApiServiceError(
      `Splitwise request failed: ${errorMessage(body) ?? 'The provider reported a failure.'}`,
      { reason: 'splitwise_api_error', upstreamStatus }
    );
  }
};

export let responseObject = (value: unknown, label: string): Record<string, any> => {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError(`Splitwise did not return the expected ${label}.`);
  }
  return value;
};

export let responseArray = (value: unknown, label: string): Record<string, any>[] => {
  if (!Array.isArray(value) || value.some(item => !isApiErrorRecord(item))) {
    throw createApiServiceError(`Splitwise did not return the expected ${label} list.`);
  }
  return value;
};

export let requireSuccess = (body: Record<string, any>) => {
  if (body.success !== true) {
    throw createApiServiceError('Splitwise did not confirm that the operation succeeded.');
  }
  return body;
};

export let checkInteger = (value: number | undefined, label: string) => {
  if (value !== undefined && !Number.isSafeInteger(value)) {
    throw createApiServiceError(`${label} must be a safe whole number.`);
  }
};
