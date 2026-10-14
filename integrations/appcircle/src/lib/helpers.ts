import { createApiServiceError } from 'slates';
import { Client } from './client';

export let createClient = (ctx: {
  auth: { token: string; expiresAt?: string };
  config: { apiBaseUrl: string };
  input?: Record<string, unknown>;
}) => {
  for (let [key, value] of Object.entries(ctx.input ?? {})) {
    if (
      (key.endsWith('Id') || key === 'branchName') &&
      value !== undefined &&
      (typeof value !== 'string' || !value.trim())
    ) {
      throw createApiServiceError(`${key} must not be empty.`);
    }
  }
  for (let key of ['page', 'size', 'perPage']) {
    let value = ctx.input?.[key];
    if (
      value !== undefined &&
      (typeof value !== 'number' ||
        !Number.isInteger(value) ||
        value < (key === 'page' ? 0 : 1))
    ) {
      throw createApiServiceError(
        `${key} must be a whole number ${key === 'page' ? 'of at least 0' : 'greater than 0'}.`
      );
    }
  }
  if (ctx.auth.expiresAt && Date.parse(ctx.auth.expiresAt) <= Date.now()) {
    throw createApiServiceError(
      'The Appcircle access token has expired. Refresh or reconnect the connection.'
    );
  }
  return new Client({ token: ctx.auth.token, apiBaseUrl: ctx.config.apiBaseUrl });
};

export let getAppcircleList = (value: unknown, label: string): any[] => {
  if (!Array.isArray(value)) {
    throw createApiServiceError(`Appcircle returned an unexpected ${label} response.`, {
      reason: 'appcircle_invalid_response'
    });
  }
  return value;
};
