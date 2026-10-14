import { createApiServiceError } from 'slates';
import { Client } from './client';

export let getSubdomain = (configSubdomain?: string, authSubdomain?: string): string => {
  let subdomain = authSubdomain || configSubdomain;
  if (!subdomain || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(subdomain)) {
    throw createApiServiceError('Reconnect Gorgias with a valid account subdomain.');
  }
  return subdomain;
};

export let createClient = (
  config: { subdomain?: string },
  auth: { token: string; subdomain?: string; authType?: 'bearer' | 'basic' }
): Client => {
  let subdomain = getSubdomain(config.subdomain, auth.subdomain);
  if (!auth.token) {
    throw createApiServiceError('Reconnect Gorgias to provide an access token or API key.');
  }
  // Stored API-key connections predate explicit authType metadata.
  let decoded = Buffer.from(auth.token, 'base64').toString('utf8');
  let legacyBasicAuth = decoded.includes(':') && decoded.includes('@');
  return new Client({
    token: auth.token,
    subdomain,
    authType: auth.authType ?? (legacyBasicAuth ? 'basic' : 'bearer')
  });
};
