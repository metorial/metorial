import { createApiServiceError } from 'slates';

export function responseString(value: unknown, field: string): string;
export function responseString(
  value: unknown,
  field: string,
  optional: true
): string | undefined;
export function responseString(
  value: unknown,
  field: string,
  optional?: true
): string | undefined {
  if (optional && value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw createApiServiceError(`Handwrytten returned a missing or invalid ${field}.`, {
      reason: 'invalid_handwrytten_response'
    });
  }
  return value;
}
