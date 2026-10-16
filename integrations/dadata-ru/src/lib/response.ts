import { createApiServiceError, isApiErrorRecord } from 'slates';

export let readSuggestions = (response: unknown): Record<string, any>[] => {
  if (
    !isApiErrorRecord(response) ||
    (response.suggestions != null && !Array.isArray(response.suggestions))
  ) {
    throw createApiServiceError('DaData returned an invalid suggestions response.', {
      reason: 'dadata_invalid_response'
    });
  }
  let suggestions = response.suggestions ?? [];
  for (let suggestion of suggestions) {
    if (
      !isApiErrorRecord(suggestion) ||
      (suggestion.data != null && !isApiErrorRecord(suggestion.data))
    ) {
      throw createApiServiceError('DaData returned an invalid suggestion.', {
        reason: 'dadata_invalid_response'
      });
    }
  }
  return suggestions;
};

export let readCleanResult = (response: unknown): Record<string, any> => {
  if (!Array.isArray(response) || response.length !== 1 || !isApiErrorRecord(response[0])) {
    throw createApiServiceError('DaData returned an invalid standardization response.', {
      reason: 'dadata_invalid_response'
    });
  }
  return response[0];
};
