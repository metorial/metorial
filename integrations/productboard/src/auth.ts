import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';

let oauthAxios = createAuthenticatedAxios({
  baseURL: 'https://app.productboard.com',
  contentType: false,
  errorAdapter: error =>
    buildApiServiceError(error, {
      providerLabel: 'Productboard',
      reason: 'productboard_oauth_error'
    })
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      authenticationMethod: z.enum(['oauth', 'api_token']).optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developer.productboard.com/reference/oauth-authorization-code'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developer.productboard.com/reference/oauth-authorization-code#access-scopes'
      }
    ],

    scopes: [
      {
        title: 'Read Entities',
        description: 'Read entity types, configurations, and records',
        scope: 'entities:read'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(' '));
      }

      return {
        url: `https://app.productboard.com/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await oauthAxios.post('/oauth2/token', null, {
        params: {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: ctx.redirectUri,
          code: ctx.code
        }
      });

      return {
        output: {
          ...normalizeOAuthTokenResponse(response.data, {
            providerLabel: 'Productboard',
            operation: 'authorization code exchange'
          }),
          authenticationMethod: 'oauth' as const
        }
      };
    },

    handleTokenRefresh: async (ctx: {
      clientId: string;
      clientSecret: string;
      output: { refreshToken?: string };
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'Productboard OAuth refresh requires a refresh token. Reconnect using OAuth.',
          { reason: 'missing_refresh_token' }
        );
      }

      let response = await oauthAxios.post('/oauth2/token', null, {
        params: {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        }
      });

      return {
        output: {
          ...normalizeOAuthTokenResponse(response.data, {
            providerLabel: 'Productboard',
            operation: 'token refresh',
            previousRefreshToken: ctx.output.refreshToken,
            refreshTokenFallbackMode: 'falsy'
          }),
          authenticationMethod: 'oauth' as const
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z.string().describe('Productboard API access token')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          authenticationMethod: 'api_token' as const
        }
      };
    }
  });
