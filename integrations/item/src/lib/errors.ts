import { buildApiServiceError as buildSharedApiServiceError } from 'slates';

const sanitizeSecret = (value: string, apiKey: string) =>
  apiKey ? value.split(apiKey).join('[REDACTED]') : value;

const createSanitizedDiagnosticError = (error: unknown, apiKey: string) => {
  let source = error instanceof Error ? error : undefined;
  let diagnostic = new Error(
    sanitizeSecret(source?.message ?? 'Item API request failed.', apiKey)
  );

  diagnostic.name = sanitizeSecret(source?.name ?? 'ItemApiError', apiKey);
  diagnostic.stack = sanitizeSecret(
    source?.stack ?? diagnostic.stack ?? `${diagnostic.name}: ${diagnostic.message}`,
    apiKey
  );

  return diagnostic;
};

export const itemApiError = (error: unknown, operation: string, apiKey: string) =>
  buildSharedApiServiceError(error, {
    providerLabel: 'Item',
    operation,
    reason: 'item_api_error',
    parent: createSanitizedDiagnosticError(error, apiKey),
    extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
    formatMessage: ({ providerLabel, operation: requestOperation, statusLabel, message }) =>
      sanitizeSecret(
        `${providerLabel} API ${requestOperation} failed: ${statusLabel}${message}`,
        apiKey
      )
  });
