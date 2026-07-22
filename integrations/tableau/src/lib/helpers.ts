import { TableauClient } from './client';
import { normalizeApiVersion, normalizeServerUrl } from './connection';
import { tableauServiceError } from './errors';

let legacyConfigString = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value : undefined;

export let createClient = (
  config: { serverUrl?: unknown; apiVersion?: unknown },
  auth: {
    token: string;
    siteId: string;
    userId?: string;
    expiresAt?: string;
    serverUrl?: string;
    apiVersion?: string;
  }
) => {
  // Prefer the connection the token was actually issued for; fall back to legacy
  // deployment config values for auth outputs stored before serverUrl was echoed.
  let serverUrl = auth.serverUrl ?? legacyConfigString(config.serverUrl);
  if (!serverUrl) {
    throw tableauServiceError(
      'The Tableau connection is missing its server URL. Reconnect the Tableau authentication profile to refresh it.'
    );
  }

  return new TableauClient({
    serverUrl: normalizeServerUrl(serverUrl),
    apiVersion: normalizeApiVersion(auth.apiVersion ?? legacyConfigString(config.apiVersion)),
    siteId: auth.siteId,
    token: auth.token,
    userId: auth.userId,
    expiresAt: auth.expiresAt
  });
};
