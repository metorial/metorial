import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';

let apiAxios = createAuthenticatedAxios({
  errorAdapter: error =>
    buildApiServiceError(error, {
      providerLabel: 'Follow Up Boss',
      reason: 'follow_up_boss_auth_error'
    }),
  baseURL: 'https://api.followupboss.com/v1'
});

let oauthAxios = createAuthenticatedAxios({
  errorAdapter: error =>
    buildApiServiceError(error, {
      providerLabel: 'Follow Up Boss',
      reason: 'follow_up_boss_auth_error'
    }),
  baseURL: 'https://app.followupboss.com'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      authMethod: z
        .enum(['oauth', 'api_key'])
        .describe('Which authentication method is being used')
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Full Access',
        description: 'Full access to Follow Up Boss on behalf of the user',
        scope: 'full_access'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'auth_code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        prompt: 'login'
      });

      return {
        url: `https://app.followupboss.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let credentials = Buffer.from(`${ctx.clientId}:${ctx.clientSecret}`).toString('base64');

      let response = await oauthAxios.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let tokens = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Follow Up Boss'
      });

      return {
        output: {
          ...tokens,
          authMethod: 'oauth' as const
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'Follow Up Boss refresh token is missing. Reconnect using OAuth.'
        );
      }

      let credentials = Buffer.from(`${ctx.clientId}:${ctx.clientSecret}`).toString('base64');

      let response = await oauthAxios.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let tokens = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Follow Up Boss',
        previousRefreshToken: ctx.output.refreshToken,
        refreshTokenFallbackMode: 'falsy'
      });

      return {
        output: {
          ...tokens,
          authMethod: 'oauth' as const
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await apiAxios.get('/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data;

      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z.string().describe('Your Follow Up Boss API Key (found in Admin -> API)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          authMethod: 'api_key' as const
        }
      };
    },

    getProfile: async (ctx: any) => {
      let basicAuth = Buffer.from(`${ctx.output.token}:`).toString('base64');

      let response = await apiAxios.get('/me', {
        headers: {
          Authorization: `Basic ${basicAuth}`
        }
      });

      let user = response.data;

      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined
        }
      };
    }
  });
