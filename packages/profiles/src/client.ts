import { createLocalSlateTransport, createSlatesClient } from '@slates/client';
import path from 'path';
import { pathToFileURL } from 'url';
import { resolveSlatesCliRoot, type SlatesCliStore } from './store';
import type { SlatesProfileRecord, SlatesStoredAuth } from './types';

let resolveEntryPath = (entry: string, opts: { cwd?: string; rootDir?: string } = {}) => {
  if (path.isAbsolute(entry)) return entry;
  return path.resolve(opts.rootDir ?? resolveSlatesCliRoot(opts.cwd), entry);
};

let loadSlateFromProfile = async (
  profile: SlatesProfileRecord,
  opts: { cwd?: string; store?: SlatesCliStore } = {}
) => {
  if (profile.target.type !== 'local') {
    throw new Error(`Unsupported profile target type: ${(profile.target as any).type}`);
  }

  let modulePath = resolveEntryPath(profile.target.entry, {
    cwd: opts.cwd,
    rootDir: opts.store?.rootDir
  });
  let loaded = await import(pathToFileURL(modulePath).href);
  let exportName = profile.target.exportName;

  let slate =
    (exportName ? loaded[exportName] : undefined) ??
    loaded.provider ??
    loaded.slate ??
    loaded.default;

  if (!slate) {
    throw new Error(
      `Could not find a slate export in ${profile.target.entry}. Tried ${
        exportName ? `\`${exportName}\`, ` : ''
      }\`provider\`, \`slate\`, and \`default\`.`
    );
  }

  return slate;
};

export let createSlatesClientFromProfile = async (
  profile: SlatesProfileRecord,
  opts: { cwd?: string; store?: SlatesCliStore; autoRefresh?: boolean } = {}
) => {
  let firstAuth = Object.values(profile.auth)[0];
  let slate = await loadSlateFromProfile(profile, opts);
  let client = createSlatesClient({
    transport: createLocalSlateTransport({ slate }),
    state: {
      config: profile.config,
      session: profile.session,
      auth: firstAuth
        ? {
            authenticationMethodId: firstAuth.authMethodId,
            output: firstAuth.output
          }
        : null
    }
  });

  if (firstAuth && opts.autoRefresh !== false) {
    attachAutoRefresh(client, profile, firstAuth, opts.store);
  }

  return client;
};

let EXPIRY_BUFFER_MS = 60 * 1000;

let hasExpiredOrExpiringOutput = (auth: SlatesStoredAuth) => {
  if (typeof auth.output?.expiresAt !== 'string' || !auth.output.expiresAt) return false;

  let expiresAt = Date.parse(auth.output.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt <= Date.now() + EXPIRY_BUFFER_MS;
};

let shouldRefreshAuth = (auth: SlatesStoredAuth) => {
  if (!hasExpiredOrExpiringOutput(auth)) return false;

  if (auth.authType === 'auth.oauth') {
    if (!auth.clientId || !auth.clientSecret) return false;
    if (typeof auth.output?.refreshToken !== 'string' || !auth.output.refreshToken)
      return false;
  }

  return true;
};

let attachAutoRefresh = (
  client: ReturnType<typeof createSlatesClient>,
  profile: SlatesProfileRecord,
  storedAuth: SlatesStoredAuth,
  store?: SlatesCliStore
) => {
  let baseRequest = client.request.bind(client);
  let inflightRefresh: Promise<void> | null = null;

  let refreshIfNeeded = async () => {
    if (inflightRefresh) {
      await inflightRefresh;
      return;
    }

    if (!shouldRefreshAuth(storedAuth)) {
      return;
    }

    inflightRefresh = (async () => {
      let authMethod = await baseRequest('slates/auth.method.get', {
        authenticationMethodId: storedAuth.authMethodId
      });

      if (!authMethod.authenticationMethod.capabilities.handleTokenRefresh?.enabled) {
        return;
      }

      let refreshed = await baseRequest('slates/auth.token_refresh.handle', {
        authenticationMethodId: storedAuth.authMethodId,
        output: storedAuth.output,
        input: storedAuth.input,
        clientId: storedAuth.clientId ?? '',
        clientSecret: storedAuth.clientSecret ?? '',
        scopes: storedAuth.scopes
      });

      storedAuth.input = refreshed.input ?? storedAuth.input;
      storedAuth.output = refreshed.output;
      storedAuth.updatedAt = new Date().toISOString();

      client.setAuth({
        authenticationMethodId: storedAuth.authMethodId,
        output: storedAuth.output
      });

      if (store) {
        store.upsertAuth(profile.id, storedAuth);
        await store.save();
      }
    })();

    try {
      await inflightRefresh;
    } finally {
      inflightRefresh = null;
    }
  };

  client.request = (async (method, params) => {
    if (method !== 'slates/auth.token_refresh.handle') {
      await refreshIfNeeded();
    }

    return baseRequest(method as never, params as never);
  }) as typeof client.request;
};
