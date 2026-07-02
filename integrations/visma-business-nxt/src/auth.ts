import { createAxios, normalizeOAuthTokenResponse, requestAxiosData, SlateAuth } from 'slates';
import { z } from 'zod';
import { vismaBusinessNxtApiError, vismaBusinessNxtServiceError } from './lib/errors';
import { businessNxtOAuthScopes, VISMA_IDENTITY_SCOPES } from './lib/scopes';

let VISMA_CONNECT_BASE_URL = 'https://connect.visma.com';

let connectApi = createAxios({
  baseURL: VISMA_CONNECT_BASE_URL
});

type VismaTokenResponse = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  token_type?: unknown;
  scope?: unknown;
};

type VismaUserInfo = {
  sub?: unknown;
  name?: unknown;
  email?: unknown;
};

let uniqueScopes = (scopes: string[]) => [...new Set(scopes.filter(Boolean))];

let parseGrantedScopes = (scope: unknown, fallback: string[]) => {
  if (Array.isArray(scope)) {
    return uniqueScopes(scope.filter((item): item is string => typeof item === 'string'));
  }

  if (typeof scope === 'string') {
    return uniqueScopes(scope.split(/\s+/g));
  }

  return uniqueScopes(fallback);
};

let normalizeVismaToken = (
  data: VismaTokenResponse,
  options: {
    operation: string;
    requestedScopes: string[];
    previousRefreshToken?: string;
  }
) => {
  let normalized = normalizeOAuthTokenResponse(data, {
    providerLabel: 'Visma Connect',
    operation: options.operation,
    previousRefreshToken: options.previousRefreshToken,
    refreshTokenFallbackMode: 'falsy'
  });

  return {
    token: normalized.token,
    refreshToken: normalized.refreshToken,
    expiresAt: normalized.expiresAt,
    tokenType: typeof data.token_type === 'string' ? data.token_type : 'Bearer',
    scopes: parseGrantedScopes(data.scope, options.requestedScopes)
  };
};

let requestToken = async (
  operation: string,
  body: URLSearchParams
): Promise<VismaTokenResponse> =>
  requestAxiosData<VismaTokenResponse>(
    operation,
    () =>
      connectApi.post('/connect/token', body.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        }
      }),
    vismaBusinessNxtApiError
  );

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      tokenType: z.string().optional(),
      scopes: z.array(z.string()).optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'Visma Connect OAuth 2.0',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'Visma Connect OAuth documentation',
        url: 'https://docs.connect.visma.com/docs/server-side-web-applications'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'Business NXT GraphQL API integration scopes',
        url: 'https://docs.vismasoftware.no/businessnxtapi/authentication/web/integrations_web/'
      }
    ],

    scopes: businessNxtOAuthScopes,

    getAuthorizationUrl: async ctx => {
      let requestedScopes = uniqueScopes([...VISMA_IDENTITY_SCOPES, ...ctx.scopes]);
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        response_mode: 'query',
        state: ctx.state,
        scope: requestedScopes.join(' ')
      });

      let maybePkce = ctx as typeof ctx & {
        codeChallenge?: string;
        codeChallengeMethod?: string;
      };

      if (maybePkce.codeChallenge) {
        params.set('code_challenge', maybePkce.codeChallenge);
        params.set('code_challenge_method', maybePkce.codeChallengeMethod ?? 'S256');
      }

      return {
        url: `${VISMA_CONNECT_BASE_URL}/connect/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let requestedScopes = uniqueScopes([...VISMA_IDENTITY_SCOPES, ...ctx.scopes]);
      let params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: ctx.code,
        redirect_uri: ctx.redirectUri,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret
      });

      let maybePkce = ctx as typeof ctx & { codeVerifier?: string };
      if (maybePkce.codeVerifier) {
        params.set('code_verifier', maybePkce.codeVerifier);
      }

      let data = await requestToken('OAuth token exchange', params);

      return {
        output: normalizeVismaToken(data, {
          operation: 'token exchange',
          requestedScopes
        })
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw vismaBusinessNxtServiceError('No Visma Connect refresh token is available.', {
          reason: 'oauth_refresh_token_missing'
        });
      }

      let params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret
      });

      let data = await requestToken('OAuth token refresh', params);

      return {
        output: normalizeVismaToken(data, {
          operation: 'token refresh',
          requestedScopes: ctx.output.scopes ?? [],
          previousRefreshToken: ctx.output.refreshToken
        })
      };
    },

    getProfile: async (ctx: any) => {
      let profile = await requestAxiosData<VismaUserInfo>(
        'profile lookup',
        () =>
          connectApi.get('/connect/userinfo', {
            headers: {
              Authorization: `Bearer ${ctx.output.token}`,
              Accept: 'application/json'
            }
          }),
        vismaBusinessNxtApiError
      );

      let id = typeof profile.sub === 'string' ? profile.sub : undefined;
      if (!id) {
        throw vismaBusinessNxtServiceError(
          'Visma Connect profile response did not include a user id.',
          { reason: 'oauth_profile_response' }
        );
      }

      return {
        profile: {
          id,
          name: typeof profile.name === 'string' ? profile.name : undefined,
          email: typeof profile.email === 'string' ? profile.email : undefined
        }
      };
    }
  });
