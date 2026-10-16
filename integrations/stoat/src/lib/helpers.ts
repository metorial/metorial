import { createApiServiceError } from 'slates';
import { Client } from './client';
import { legacyBaseUrl, validateBaseUrl } from './connection';

export let createClient = (ctx: {
  config: { [key: string]: unknown };
  auth: { token: string; authType: 'bot' | 'session'; baseUrl?: string };
}) => {
  let baseUrl = ctx.auth.baseUrl ?? ctx.config.baseUrl ?? legacyBaseUrl;
  if (typeof baseUrl !== 'string') {
    throw createApiServiceError(
      'The saved Stoat API URL is invalid. Reconnect with a valid API URL.'
    );
  }
  return new Client({
    token: ctx.auth.token,
    authType: ctx.auth.authType,
    baseUrl: validateBaseUrl(baseUrl)
  });
};
