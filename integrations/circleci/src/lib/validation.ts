import { createApiServiceError } from 'slates';

export let circleCiValidationError = (message: string) =>
  createApiServiceError(message, {
    reason: 'circleci_invalid_input'
  });

export let validatePipelineParameters = (parameters: Record<string, unknown> | undefined) => {
  if (!parameters) return;

  let entries = Object.entries(parameters);
  if (entries.length > 100) {
    throw circleCiValidationError('CircleCI accepts at most 100 pipeline parameters.');
  }

  for (let [key, value] of entries) {
    if (key.length > 128) {
      throw circleCiValidationError(
        `Pipeline parameter "${key.slice(0, 32)}" exceeds CircleCI's 128-character key limit.`
      );
    }

    if (
      !(
        typeof value === 'string' ||
        typeof value === 'boolean' ||
        (typeof value === 'number' && Number.isInteger(value))
      )
    ) {
      throw circleCiValidationError(
        `Pipeline parameter "${key}" must be a string, boolean, or integer.`
      );
    }

    if (typeof value === 'string' && value.length > 512) {
      throw circleCiValidationError(
        `Pipeline parameter "${key}" exceeds CircleCI's 512-character value limit.`
      );
    }
  }
};
