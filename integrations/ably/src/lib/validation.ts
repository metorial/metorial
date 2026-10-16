import { createApiServiceError } from 'slates';

export let validateInteger = (
  name: string,
  value: number | undefined,
  min: number,
  max = Number.MAX_SAFE_INTEGER
) => {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < min || value > max)) {
    throw createApiServiceError(`${name} must be an integer between ${min} and ${max}.`);
  }
};

export let validateQuery = (params: {
  start?: string | number;
  end?: string | number;
  limit?: number;
}) => {
  validateInteger('limit', params.limit, 1, 1000);
  for (let name of ['start', 'end'] as const) {
    let value = params[name];
    if (
      value !== undefined &&
      (String(value).trim() === '' ||
        !/^\d+$/.test(String(value)) ||
        !Number.isSafeInteger(Number(value)))
    ) {
      throw createApiServiceError(
        `${name} must be milliseconds since the Unix epoch as a non-negative integer.`
      );
    }
  }
  if (
    params.start !== undefined &&
    params.end !== undefined &&
    Number(params.start) > Number(params.end)
  ) {
    throw createApiServiceError('start must not be later than end.');
  }
};

export let presenceAction = (action: unknown): string | undefined => {
  if (typeof action === 'string') return action;
  if (typeof action === 'number')
    return ['absent', 'present', 'enter', 'leave', 'update'][action];
  return undefined;
};
