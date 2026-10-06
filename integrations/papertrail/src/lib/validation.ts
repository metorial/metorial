import { createApiServiceError } from 'slates';

export const requireToken = (token: string) => {
  if (!token?.trim() || /[\r\n]/.test(token))
    throw createApiServiceError(
      'Provide a valid Papertrail API token from your user profile settings.'
    );
  return token.trim();
};
export const requireId = (value: number, label: string) => {
  if (!Number.isSafeInteger(value) || value < 1)
    throw createApiServiceError(`${label} must be a positive, safe whole-number ID.`);
};
export const requireName = (value: string, label: string) => {
  if (!value.trim()) throw createApiServiceError(`Provide a nonempty ${label}.`);
};
export const requireUpdate = (params: Record<string, unknown>) => {
  if (!Object.values(params).some(value => value !== undefined))
    throw createApiServiceError('Provide at least one field to update.');
};
