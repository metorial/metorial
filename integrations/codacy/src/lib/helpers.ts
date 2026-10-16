import { createApiServiceError } from 'slates';
import { CodacyClient } from './client';

export let createClient = (ctx: {
  auth: { token: string; baseUrl?: string };
  config: { baseUrl?: unknown; provider: string; organization: string };
}): CodacyClient => {
  return new CodacyClient({
    token: ctx.auth.token,
    baseUrl:
      ctx.auth.baseUrl ??
      (typeof ctx.config.baseUrl === 'string' ? ctx.config.baseUrl : undefined) ??
      'https://app.codacy.com/api/v3',
    provider: ctx.config.provider,
    organization: ctx.config.organization
  });
};

// These identifiers are required by Codacy's response schemas; never substitute a synthetic ID.
export let requireCodacyString = (value: unknown, field: string): string => {
  if (typeof value !== 'string') {
    throw createApiServiceError(`Codacy returned an invalid or missing ${field}.`, {
      reason: 'codacy_invalid_response'
    });
  }
  return value;
};

export let requireCodacyNumber = (value: unknown, field: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw createApiServiceError(`Codacy returned an invalid or missing ${field}.`, {
      reason: 'codacy_invalid_response'
    });
  }
  return value;
};
