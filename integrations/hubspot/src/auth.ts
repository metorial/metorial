import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { hubSpotApiError, hubSpotOAuthError, hubSpotServiceError } from './lib/errors';
import {
  hubSpotOptionalScopeValues,
  hubSpotRequiredScopeValues,
  hubSpotSelectableOAuthScopes,
  parseHubSpotGrantedScopes
} from './lib/scopes';

type HubSpotOAuthTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  hub_id?: string | number;
  user_id?: string | number;
  user?: string;
  hub_domain?: string;
  scope?: string;
  scopes?: string[];
};

type HubSpotTokenMetadata = {
  active?: boolean;
  user_id?: string | number;
  user?: string;
  hub_id?: string | number;
  hub_domain?: string;
  scopes?: string[];
};

type OAuthVariant = {
  name: string;
  key: string;
  tokenPath: '/oauth/v1/token' | '/oauth/2026-03/token';
  getAccessTokenMetadata?: (ctx: any, token: string) => Promise<HubSpotTokenMetadata>;
  profileFromStoredOutput?: boolean;
  normalizeLoopbackRedirectUri?: boolean;
};

let formHeaders = { 'Content-Type': 'application/x-www-form-urlencoded' };
let SECONDS_TO_MS = 1000;
let HUBSPOT_DEVELOPER_PLATFORM_OAUTH_METHOD_ID = 'developer_platform_oauth';

let uniqueScopes = (scopes: string[]) => [...new Set(scopes)];
let requiredScopeSet = new Set(hubSpotRequiredScopeValues);
let optionalScopeSet = new Set(hubSpotOptionalScopeValues);

let normalizeLoopbackRedirectUri = (redirectUri: string) => {
  let url = new URL(redirectUri);
  if (url.protocol === 'http:' && url.hostname === '127.0.0.1') {
    url.hostname = 'localhost';
  }

  return url.toString();
};

let getRedirectUri = (variant: OAuthVariant, redirectUri: string) =>
  variant.normalizeLoopbackRedirectUri
    ? normalizeLoopbackRedirectUri(redirectUri)
    : redirectUri;

let postOAuthForm = async <T>(
  path: string,
  body: Record<string, string>,
  operation: string
) => {
  let httpClient = createAxios({ baseURL: 'https://api.hubapi.com' });

  try {
    let response = await httpClient.post(path, new URLSearchParams(body).toString(), {
      headers: formHeaders
    });
    return response.data as T;
  } catch (error) {
    throw hubSpotOAuthError(operation, error);
  }
};

let getLegacyAccessTokenMetadata = async (_ctx: any, token: string) => {
  let httpClient = createAxios({ baseURL: 'https://api.hubapi.com' });

  try {
    let response = await httpClient.get(
      `/oauth/v1/access-tokens/${encodeURIComponent(token)}`
    );
    return response.data as HubSpotTokenMetadata;
  } catch (error) {
    throw hubSpotOAuthError('access token metadata lookup', error);
  }
};

let getDeveloperPlatformAccessTokenMetadata = async (
  ctx: { clientId: string; clientSecret: string },
  token: string
) =>
  postOAuthForm<HubSpotTokenMetadata>(
    '/oauth/2026-03/token/introspect',
    {
      client_id: ctx.clientId,
      client_secret: ctx.clientSecret,
      token_type_hint: 'access_token',
      token
    },
    'access token introspection'
  );

let profileFromMetadata = (data: HubSpotTokenMetadata) => {
  if (data.active === false) {
    throw hubSpotServiceError('HubSpot OAuth access token is inactive');
  }

  let hubId = data.hub_id == null ? undefined : String(data.hub_id);
  let userId = data.user_id == null ? undefined : String(data.user_id);
  let name = data.user ?? data.hub_domain ?? (hubId ? `HubSpot Portal ${hubId}` : 'HubSpot');

  return {
    id: userId ?? hubId ?? name,
    email: data.user,
    name,
    hubId,
    hubDomain: data.hub_domain
  };
};

let tokenResultFromResponse = (
  data: HubSpotOAuthTokenResponse,
  fallbackRefreshToken?: string,
  metadata?: HubSpotTokenMetadata
) => {
  if (!data.access_token) {
    throw hubSpotServiceError('HubSpot OAuth token response did not include an access token');
  }

  let expiresAt =
    typeof data.expires_in === 'number'
      ? new Date(Date.now() + data.expires_in * SECONDS_TO_MS).toISOString()
      : undefined;
  let scopes = uniqueScopes([
    ...parseHubSpotGrantedScopes(data.scopes),
    ...parseHubSpotGrantedScopes(data.scope),
    ...parseHubSpotGrantedScopes(metadata?.scopes)
  ]);
  let hubId = metadata?.hub_id ?? data.hub_id;
  let userId = metadata?.user_id ?? data.user_id;

  return {
    output: {
      token: data.access_token,
      refreshToken: data.refresh_token ?? fallbackRefreshToken,
      expiresAt,
      hubId: hubId == null ? undefined : String(hubId),
      userId: userId == null ? undefined : String(userId),
      user: metadata?.user ?? data.user,
      hubDomain: metadata?.hub_domain ?? data.hub_domain
    },
    scopes: scopes.length > 0 ? scopes : undefined
  };
};

let getTokenMetadata = async (
  variant: OAuthVariant,
  ctx: any,
  data: HubSpotOAuthTokenResponse
) => {
  if (!variant.getAccessTokenMetadata || !data.access_token) {
    return undefined;
  }

  return variant.getAccessTokenMetadata(ctx, data.access_token);
};

let metadataFromStoredOutput = (output: {
  hubId?: string;
  userId?: string;
  user?: string;
  hubDomain?: string;
}): HubSpotTokenMetadata => ({
  hub_id: output.hubId,
  user_id: output.userId,
  user: output.user,
  hub_domain: output.hubDomain
});

let buildAuthorizationUrl = async (ctx: {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes: string[];
}) => {
  let selectedOptionalScopes = hubSpotOptionalScopeValues.filter(scope =>
    ctx.scopes.includes(scope)
  );
  let additionalRequiredScopes = ctx.scopes.filter(
    scope => !requiredScopeSet.has(scope) && !optionalScopeSet.has(scope)
  );
  let requiredScopes = uniqueScopes([
    ...hubSpotRequiredScopeValues,
    ...additionalRequiredScopes
  ]);
  let params = new URLSearchParams({
    client_id: ctx.clientId,
    redirect_uri: ctx.redirectUri,
    scope: requiredScopes.join(' '),
    state: ctx.state
  });

  if (selectedOptionalScopes.length > 0) {
    params.set('optional_scope', selectedOptionalScopes.join(' '));
  }

  return {
    url: `https://app.hubspot.com/oauth/authorize?${params.toString()}`
  };
};

let createHubSpotOauth = (variant: OAuthVariant) => ({
  type: 'auth.oauth' as const,
  name: variant.name,
  key: variant.key,
    docs: [
    {
      type: 'docs.auth.oauth',
      name: 'OAuth documentation',
      url: 'https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/oauth/oauth-quickstart-guide'
    },
    {
      type: 'docs.auth.oauth_scopes',
      name: 'OAuth scopes',
      url: 'https://developers.hubspot.com/docs/api/scopes'
    }
    ],

  // Required HubSpot scopes are always sent automatically. Expose only optional
  // scopes here so CLI scope selection maps cleanly to HubSpot optional_scope.
  scopes: hubSpotSelectableOAuthScopes,

  getAuthorizationUrl: async (ctx: {
    clientId: string;
    redirectUri: string;
    state: string;
    scopes: string[];
  }) =>
    buildAuthorizationUrl({
      ...ctx,
      redirectUri: getRedirectUri(variant, ctx.redirectUri)
    }),

  handleCallback: async (ctx: any) => {
    let data = await postOAuthForm<HubSpotOAuthTokenResponse>(
      variant.tokenPath,
      {
        grant_type: 'authorization_code',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: getRedirectUri(variant, ctx.redirectUri),
        code: ctx.code
      },
      'authorization code exchange'
    );

    let metadata = await getTokenMetadata(variant, ctx, data);

    return tokenResultFromResponse(data, undefined, metadata);
  },

  handleTokenRefresh: async (ctx: any) => {
    if (!ctx.output.refreshToken) {
      throw hubSpotServiceError('HubSpot OAuth refresh token is missing');
    }

    let data = await postOAuthForm<HubSpotOAuthTokenResponse>(
      variant.tokenPath,
      {
        grant_type: 'refresh_token',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        refresh_token: ctx.output.refreshToken
      },
      'token refresh'
    );

    let metadata = await getTokenMetadata(variant, ctx, data);

    return tokenResultFromResponse(data, ctx.output.refreshToken, metadata);
  },

  getProfile: async (ctx: any) => {
    if (variant.profileFromStoredOutput) {
      return {
        profile: profileFromMetadata(metadataFromStoredOutput(ctx.output))
      };
    }

    let data = variant.getAccessTokenMetadata
      ? await variant.getAccessTokenMetadata(ctx, ctx.output.token)
      : metadataFromStoredOutput(ctx.output);

    return {
      profile: profileFromMetadata(data)
    };
  }
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      hubId: z.string().optional(),
      userId: z.string().optional(),
      user: z.string().optional(),
      hubDomain: z.string().optional()
    })
  )
  .addOauth(
    createHubSpotOauth({
      name: 'OAuth (Legacy Public App)',
      key: 'oauth',
      tokenPath: '/oauth/v1/token',
      getAccessTokenMetadata: getLegacyAccessTokenMetadata
    })
  )
  .addOauth(
    createHubSpotOauth({
      name: 'OAuth (Developer Platform / CLI App)',
      key: HUBSPOT_DEVELOPER_PLATFORM_OAUTH_METHOD_ID,
      tokenPath: '/oauth/2026-03/token',
      getAccessTokenMetadata: getDeveloperPlatformAccessTokenMetadata,
      profileFromStoredOutput: true,
      normalizeLoopbackRedirectUri: true
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Private App Token (Legacy Private App)',
    key: 'private_app_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Private App access token from HubSpot Settings > Integrations > Private Apps'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let httpClient = createAxios({ baseURL: 'https://api.hubapi.com' });

      try {
        let response = await httpClient.get('/account-info/v3/details', {
          headers: { Authorization: `Bearer ${ctx.output.token}` }
        });

        let data = response.data;

        return {
          profile: {
            id: String(data.portalId),
            name: data.accountType || 'HubSpot Account',
            hubId: String(data.portalId)
          }
        };
      } catch (error) {
        throw hubSpotApiError(error, 'GET /account-info/v3/details');
      }
    }
  });
