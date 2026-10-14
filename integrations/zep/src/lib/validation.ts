import { createApiServiceError } from 'slates';

export let validateGraphTarget = (userId?: string, graphId?: string) => {
  if (Boolean(userId) === Boolean(graphId)) {
    throw createApiServiceError('Provide exactly one of userId or graphId.');
  }
};

export let validateWholeNumber = (value: number | undefined, field: string, minimum = 1) => {
  if (value !== undefined && (!Number.isInteger(value) || value < minimum)) {
    throw createApiServiceError(
      `${field} must be a whole number greater than or equal to ${minimum}.`
    );
  }
};

export let validateScalarAttributes = (
  attributes: Record<string, unknown> | undefined,
  field: string
) => {
  if (
    attributes &&
    Object.values(attributes).some(
      value =>
        value !== null &&
        typeof value !== 'string' &&
        typeof value !== 'number' &&
        typeof value !== 'boolean'
    )
  ) {
    throw createApiServiceError(
      `${field} values must be strings, numbers, booleans, or null.`
    );
  }
};
