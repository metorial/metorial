import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      authType: z.enum(['api_key', 'oauth']).describe('The authentication method used')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Your Semrush API key. Find it on the API Units tab of the Subscription Info page.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          authType: 'api_key' as const
        }
      };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth',
    scopes: [
      {
        title: 'User ID',
        description: 'Access your user identity',
        scope: 'user.id'
      },
      {
        title: 'Domains Info',
        description: 'Access domain information and reports',
        scope: 'domains.info'
      },
      {
        title: 'URL Info',
        description: 'Access URL-level information',
        scope: 'url.info'
      },
      {
        title: 'Position Tracking',
        description: 'Access position tracking data and campaigns',
        scope: 'positiontracking.info'
      }
    ],
    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state
      });
      return {
        url: `https://oauth.semrush.com/oauth2/authorize?${params.toString()}`
      };
    },
    handleCallback: async ctx => {
      let axios = createAuthenticatedAxios({
        baseURL: 'https://oauth.semrush.com',
        contentType: 'application/x-www-form-urlencoded',
        errorAdapter: error =>
          buildApiServiceError(error, {
            providerLabel: 'Semrush OAuth',
            reason: 'oauth_request_failed'
          })
      });

      let response = await axios.post(
        '/oauth2/access_token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Semrush',
        operation: 'token exchange'
      });

      return {
        output: {
          ...data,
          authType: 'oauth' as const
        }
      };
    },
    handleTokenRefresh: async (ctx: {
      output: { refreshToken?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'No refresh token is available. Reconnect with OAuth 2.0.'
        );
      }

      let axios = createAuthenticatedAxios({
        baseURL: 'https://oauth.semrush.com',
        contentType: 'application/x-www-form-urlencoded',
        errorAdapter: error =>
          buildApiServiceError(error, {
            providerLabel: 'Semrush OAuth',
            reason: 'oauth_request_failed'
          })
      });

      let response = await axios.post(
        '/oauth2/access_token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Semrush',
        operation: 'token refresh',
        previousRefreshToken: ctx.output.refreshToken,
        refreshTokenFallbackMode: 'falsy'
      });

      return {
        output: {
          ...data,
          authType: 'oauth' as const
        }
      };
    }
  });
