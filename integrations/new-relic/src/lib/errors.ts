import { buildApiServiceError, createApiServiceError, extractApiErrorMessage } from 'slates';

let newRelicMessageOptions = {
  detailKeys: ['message', 'description', 'details', 'error_description', 'error', 'type'],
  includeNumbers: false,
  nestedKeys: ['errors']
};

export let newRelicApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'New Relic',
    operation,
    reason: 'new_relic_api_error',
    ...newRelicMessageOptions,
    extractMessage: (input, helpers) => {
      let response = helpers.getResponse(input);
      return extractApiErrorMessage(input, {
        ...newRelicMessageOptions,
        response: {
          ...response,
          data: response?.data ?? input
        }
      });
    },
    formatMessage: ({ operation: apiOperation, statusLabel, message }) =>
      `New Relic ${apiOperation} failed: ${statusLabel}${message}`
  });

export let newRelicGraphqlErrors = (operation: string, errors: unknown[]) => {
  let message = extractApiErrorMessage(errors, {
    ...newRelicMessageOptions,
    response: {
      data: errors
    }
  });
  return createApiServiceError(`New Relic ${operation} failed: ${message}`, {
    reason: 'new_relic_graphql_error'
  });
};
