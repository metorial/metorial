import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  collectApiErrorDetails,
  createApiServiceError,
  getApiErrorResponse,
  getApiErrorStatus,
  getResponseHeaderValue,
  isApiErrorRecord
} from 'slates';

export const companiesHouseValidationError = (
  message: string,
  reason = 'companies_house_validation_error'
) => createApiServiceError(message, { reason });

let redact = (value: string, secrets: readonly string[]) => {
  let output = value;
  for (let secret of secrets) {
    if (secret) output = output.split(secret).join('[redacted]');
  }
  return output;
};

export const companiesHouseApiError = (
  error: unknown,
  operation = 'request',
  secrets: readonly string[] = []
) => {
  if (error instanceof ServiceError) return error;

  let status = getApiErrorStatus(error);
  let numericStatus = typeof status === 'string' ? Number(status) : status;
  let specialMessage: string | undefined;

  if (numericStatus === 401) {
    specialMessage =
      'Companies House authentication failed. Check that the API key is valid and retry.';
  } else if (numericStatus === 404) {
    specialMessage = `The requested Companies House resource was not found while trying to ${operation}. Check the identifier and retry.`;
  } else if (numericStatus === 406) {
    specialMessage =
      'Companies House could not provide the requested document representation. Choose a MIME type advertised by the document metadata.';
  } else if (numericStatus === 429) {
    let response =
      isApiErrorRecord(error) && isApiErrorRecord(error.response) ? error.response : undefined;
    let reset = getResponseHeaderValue(response?.headers, 'x-ratelimit-reset');
    specialMessage = reset
      ? `Companies House rate limit reached. Retry after the X-RateLimit-Reset time ${reset}.`
      : 'Companies House rate limit reached. Wait until the X-RateLimit-Reset window has elapsed before retrying.';
  }

  if (specialMessage) {
    return createApiServiceError(redact(specialMessage, secrets), {
      reason: 'companies_house_api_error',
      upstreamStatus: status,
      parent: error
    });
  }

  let mapped = buildApiServiceError(error, {
    providerLabel: 'Companies House',
    reason: 'companies_house_api_error',
    operation,
    extractMessage: currentError => {
      let details: string[] = [];
      collectApiErrorDetails(getApiErrorResponse(currentError)?.data, details, {
        detailKeys: ['message', 'error', 'detail', 'description'],
        nestedKeys: ['errors']
      });
      return details.length > 0
        ? redact(details.join(' - '), secrets)
        : 'The provider returned an unexpected error.';
    }
  });
  mapped.data.message = redact(mapped.data.message, secrets);
  return mapped;
};

export const companiesHouseDownloadError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'Companies House document download',
    reason: 'companies_house_document_download_error',
    operation,
    extractMessage: () => 'The document bytes could not be retrieved from the redirect URL.'
  });
