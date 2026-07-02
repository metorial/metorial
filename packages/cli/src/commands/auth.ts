import { confirm, select } from '@inquirer/prompts';
import {
  normalizeMicrosoftRedirectUri,
  normalizeMicrosoftRedirectUriForIntegration
} from '@slates/oauth-microsoft';
import type { SlatesOAuthCredentialRecord, SlatesStoredAuth } from '@slates/profiles';
import {
  chooseAuthMethod,
  createClientContext,
  createIntegrationClientContext,
  openIntegrationStore
} from '../lib/context';
import { chooseScopes, createOAuthCallbackListener, printBrowserUrl } from '../lib/oauth';
import {
  parseJsonObject,
  parseList,
  promptForObjectSchema,
  promptForString
} from '../lib/prompts';
import type { JsonInput, WithProfile } from '../lib/types';

type JsonObject = Record<string, any>;
let NOTION_INTEGRATION_KEY = 'notion';
let SALESFORCE_INTEGRATION_KEY = 'salesforce';
let INTERCOM_INTEGRATION_KEY = 'intercom';
let TYPEFORM_INTEGRATION_KEY = 'typeform';
let XERO_INTEGRATION_KEY = 'xero';
let ZENDESK_INTEGRATION_KEY = 'zendesk';
let HUBSPOT_INTEGRATION_KEY = 'hubspot';
let HUBSPOT_DEVELOPER_PLATFORM_OAUTH_METHOD_ID = 'developer_platform_oauth';
let LOOPBACK_REDIRECT_NORMALIZED_INTEGRATIONS = new Set([
  INTERCOM_INTEGRATION_KEY,
  NOTION_INTEGRATION_KEY,
  SALESFORCE_INTEGRATION_KEY,
  TYPEFORM_INTEGRATION_KEY,
  XERO_INTEGRATION_KEY,
  ZENDESK_INTEGRATION_KEY
]);

type AuthSetupOptions = WithProfile &
  JsonInput & {
    authMethodId?: string;
    clientId?: string;
    clientSecret?: string;
    oauthCredential?: string;
    scopes?: string;
  };

export let normalizeCallbackRedirectUriForIntegration = (
  integration: string,
  redirectUri: string,
  authMethodId?: string
) => {
  if (
    LOOPBACK_REDIRECT_NORMALIZED_INTEGRATIONS.has(integration) ||
    (integration === HUBSPOT_INTEGRATION_KEY &&
      authMethodId === HUBSPOT_DEVELOPER_PLATFORM_OAUTH_METHOD_ID)
  ) {
    return normalizeMicrosoftRedirectUri(redirectUri);
  }

  return normalizeMicrosoftRedirectUriForIntegration(integration, redirectUri);
};

export let listAuth = async (opts: WithProfile) => {
  let { store, profile } = await createClientContext(opts);
  return store.listAuth(profile.id);
};

export let getAuth = async (opts: WithProfile & { authMethodId?: string }) => {
  let { store, profile } = await createClientContext(opts);
  return store.getAuth(profile.id, opts.authMethodId);
};

export let listOAuthCredentials = async (
  opts: Pick<WithProfile, 'integration'> & { authMethodId?: string }
) => {
  let { store } = await openIntegrationStore(opts.integration);
  return store.listOAuthCredentials(opts.authMethodId).map(credential => ({
    id: credential.id,
    name: credential.name,
    authMethodId: credential.authMethodId,
    clientId: credential.clientId
  }));
};

export let addOAuthCredentials = async (
  opts: Pick<WithProfile, 'integration'> & {
    authMethodId?: string;
    name?: string;
    clientId?: string;
    clientSecret?: string;
  }
): Promise<SlatesOAuthCredentialRecord> => {
  let { store, client } = await createIntegrationClientContext({
    integration: opts.integration
  });
  let authMethod = await chooseAuthMethod({
    client,
    authMethodId: opts.authMethodId,
    forcePrompt: !opts.authMethodId
  });

  if (authMethod.type !== 'auth.oauth') {
    throw new Error(`Authentication method ${authMethod.id} is not OAuth.`);
  }

  let clientId = opts.clientId ?? (await promptForString({ message: 'OAuth client ID' }));
  let clientSecret =
    opts.clientSecret ??
    (await promptForString({ message: 'OAuth client secret', secret: true }));
  let name =
    opts.name ??
    (await promptForString({
      message: 'Credential name',
      defaultValue: `${authMethod.name} credentials`
    }));

  let credential = store.upsertOAuthCredential({
    name,
    authMethodId: authMethod.id,
    clientId,
    clientSecret
  });
  await store.save();
  return credential;
};

let createOAuthCredentialInteractive = async (opts: {
  store: Awaited<ReturnType<typeof createClientContext>>['store'];
  authMethod: { id: string; name: string; type: string };
  clientId?: string;
  clientSecret?: string;
}) => {
  let clientId = opts.clientId ?? (await promptForString({ message: 'OAuth client ID' }));
  let clientSecret =
    opts.clientSecret ??
    (await promptForString({ message: 'OAuth client secret', secret: true }));
  let name = await promptForString({
    message: 'Credential name',
    defaultValue: `${opts.authMethod.name} credentials`
  });

  let credential = opts.store.upsertOAuthCredential({
    name,
    authMethodId: opts.authMethod.id,
    clientId,
    clientSecret
  });
  await opts.store.save();
  return credential;
};

let chooseOAuthCredentialsForSetup = async (opts: {
  store: Awaited<ReturnType<typeof createClientContext>>['store'];
  authMethod: { id: string; name: string; type: string };
  clientId?: string;
  clientSecret?: string;
  oauthCredential?: string;
}) => {
  if (opts.authMethod.type !== 'auth.oauth') {
    return null;
  }

  if (opts.clientId || opts.clientSecret) {
    let credential = await createOAuthCredentialInteractive({
      store: opts.store,
      authMethod: opts.authMethod,
      clientId: opts.clientId,
      clientSecret: opts.clientSecret
    });
    return {
      credential,
      clientId: credential.clientId,
      clientSecret: credential.clientSecret
    };
  }

  if (opts.oauthCredential) {
    let credential = opts.store.getOAuthCredential(opts.oauthCredential, opts.authMethod.id);
    if (!credential) {
      throw new Error(`Unknown OAuth credentials: ${opts.oauthCredential}`);
    }

    return {
      credential,
      clientId: credential.clientId,
      clientSecret: credential.clientSecret
    };
  }

  let credentials = opts.store.listOAuthCredentials(opts.authMethod.id);
  if (credentials.length === 0) {
    let credential = await createOAuthCredentialInteractive({
      store: opts.store,
      authMethod: opts.authMethod
    });
    return {
      credential,
      clientId: credential.clientId,
      clientSecret: credential.clientSecret
    };
  }

  if (credentials.length === 1) {
    let useExisting = await confirm({
      message: `Use saved OAuth credentials "${credentials[0]!.name}"?`,
      default: true
    });

    if (useExisting) {
      let credential = credentials[0]!;
      return {
        credential,
        clientId: credential.clientId,
        clientSecret: credential.clientSecret
      };
    }

    let credential = await createOAuthCredentialInteractive({
      store: opts.store,
      authMethod: opts.authMethod
    });
    return {
      credential,
      clientId: credential.clientId,
      clientSecret: credential.clientSecret
    };
  }

  let selected = await select({
    message: 'Choose OAuth credentials',
    choices: [
      ...credentials.map(credential => ({
        name: `${credential.name} (${credential.clientId})`,
        value: credential.id
      })),
      {
        name: 'Create new OAuth credentials',
        value: '__new__'
      }
    ]
  });

  if (selected === '__new__') {
    let credential = await createOAuthCredentialInteractive({
      store: opts.store,
      authMethod: opts.authMethod
    });
    return {
      credential,
      clientId: credential.clientId,
      clientSecret: credential.clientSecret
    };
  }

  let credential = opts.store.getOAuthCredential(selected, opts.authMethod.id);
  if (!credential) {
    throw new Error(`Unknown OAuth credentials: ${selected}`);
  }

  return {
    credential,
    clientId: credential.clientId,
    clientSecret: credential.clientSecret
  };
};

let runAuthSetup = async (opts: AuthSetupOptions): Promise<SlatesStoredAuth> => {
  let { store, profile, client } = await createClientContext({
    ...opts,
    autoRefresh: false
  });
  client.clearAuth();
  let authMethod = await chooseAuthMethod({
    client,
    authMethodId: opts.authMethodId,
    forcePrompt: !opts.authMethodId
  });

  let defaultInput = authMethod.capabilities.getDefaultInput?.enabled
    ? ((await client.getDefaultAuthInput(authMethod.id)).input ?? {})
    : {};
  let authInput =
    parseJsonObject(opts.input, 'auth input') ??
    (await promptForObjectSchema(authMethod.inputSchema, defaultInput));

  if (authMethod.capabilities.handleChangedInput?.enabled) {
    authInput =
      (
        await client.updateAuthInput({
          authenticationMethodId: authMethod.id,
          previousInput: null,
          newInput: authInput
        })
      ).input ?? authInput;
  }

  let output: JsonObject;
  let finalInput = authInput;
  let callbackState: JsonObject | null = null;
  let scopes = parseList(opts.scopes);

  if (authMethod.type === 'auth.oauth') {
    let callback = await createOAuthCallbackListener();
    let redirectUri = normalizeCallbackRedirectUriForIntegration(
      opts.integration,
      callback.redirectUri,
      authMethod.id
    );
    console.log(`OAuth redirect URL: ${redirectUri}`);

    let resolvedOAuthCredentials = await chooseOAuthCredentialsForSetup({
      store,
      authMethod,
      clientId: opts.clientId,
      clientSecret: opts.clientSecret,
      oauthCredential: opts.oauthCredential
    });
    if (!resolvedOAuthCredentials) {
      throw new Error(`Authentication method ${authMethod.id} is not OAuth.`);
    }

    let clientId = resolvedOAuthCredentials.clientId;
    let clientSecret = resolvedOAuthCredentials.clientSecret;
    scopes = await chooseScopes(authMethod, scopes);

    let authorizationUrl = await client.getAuthorizationUrl({
      authenticationMethodId: authMethod.id,
      redirectUri,
      state: callback.state,
      input: authInput,
      clientId,
      clientSecret,
      scopes
    });

    callbackState = authorizationUrl.callbackState ?? null;
    finalInput = authorizationUrl.input ?? authInput;

    printBrowserUrl(authorizationUrl.authorizationUrl);
    let callbackResult = await callback.wait();
    if (callbackResult.state !== callback.state) {
      throw new Error('OAuth state mismatch.');
    }

    let authOutput = await client.handleAuthorizationCallback({
      authenticationMethodId: authMethod.id,
      code: callbackResult.code,
      state: callbackResult.state,
      redirectUri,
      input: finalInput,
      clientId,
      clientSecret,
      scopes,
      callbackParams: callbackResult.callbackParams,
      callbackState: callbackState ?? undefined
    });

    output = authOutput.output;
    finalInput = authOutput.input ?? finalInput;
    scopes = authOutput.scopes ?? scopes;

    let profileInfo = authMethod.capabilities.getProfile?.enabled
      ? await client.getAuthProfile({
          authenticationMethodId: authMethod.id,
          output,
          input: finalInput,
          scopes
        })
      : null;

    let stored = store.upsertAuth(profile.id, {
      authMethodId: authMethod.id,
      authMethodName: authMethod.name,
      authType: authMethod.type,
      input: finalInput,
      output,
      oauthCredentialId: resolvedOAuthCredentials.credential?.id,
      scopes,
      clientId,
      clientSecret,
      callbackState,
      profile: profileInfo?.profile ?? null
    });

    await store.save();
    return stored;
  }

  let authOutput = await client.getAuthOutput({
    authenticationMethodId: authMethod.id,
    input: authInput
  });
  output = authOutput.output;
  scopes = authOutput.scopes ?? scopes;

  let profileInfo = authMethod.capabilities.getProfile?.enabled
    ? await client.getAuthProfile({
        authenticationMethodId: authMethod.id,
        output,
        input: finalInput,
        scopes
      })
    : null;

  let stored = store.upsertAuth(profile.id, {
    authMethodId: authMethod.id,
    authMethodName: authMethod.name,
    authType: authMethod.type,
    input: finalInput,
    output,
    scopes,
    profile: profileInfo?.profile ?? null
  });

  await store.save();
  return stored;
};

export let setupAuth = async (opts: AuthSetupOptions) => runAuthSetup(opts);

export let refreshAuth = async (opts: WithProfile & { authMethodId?: string }) => {
  let { store, profile, client } = await createClientContext(opts);
  let storedAuth = store.getAuth(profile.id, opts.authMethodId);
  if (!storedAuth) {
    throw new Error('No stored authentication was found for this profile.');
  }

  let authMethod = await client.getAuthMethod(storedAuth.authMethodId);
  if (!authMethod.authenticationMethod.capabilities.handleTokenRefresh?.enabled) {
    throw new Error('This authentication method does not support token refresh.');
  }

  let refreshed = await client.refreshToken({
    authenticationMethodId: storedAuth.authMethodId,
    output: storedAuth.output,
    input: storedAuth.input,
    clientId: storedAuth.clientId ?? '',
    clientSecret: storedAuth.clientSecret ?? '',
    scopes: storedAuth.scopes
  });

  let updated = store.upsertAuth(profile.id, {
    ...storedAuth,
    input: refreshed.input ?? storedAuth.input,
    output: refreshed.output
  });
  await store.save();
  return updated;
};
