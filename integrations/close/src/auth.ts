import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let apiAxios = createAxios({
  baseURL: 'https://api.close.com'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      authType: z.enum(['oauth', 'api_key'])
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developer.close.com/topics/authentication-oauth2/'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developer.close.com/topics/authentication-oauth2/'
      }
    ],

    scopes: [
      {
        title: 'Full Access',
        description: 'Full read and write access to all organization data',
        scope: 'all.full_access'
      },
      {
        title: 'Offline Access',
        description: 'Allows refreshing access tokens without user interaction',
        scope: 'offline_access'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `https://app.close.com/oauth2/authorize/?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await apiAxios.post(
        '/oauth2/token/',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;
      let expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          authType: 'oauth' as const
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw new Error('No refresh token available');
      }

      let response = await apiAxios.post(
        '/oauth2/token/',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;
      let expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt,
          authType: 'oauth' as const
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string };
      input: Record<string, any>;
      scopes: string[];
    }) => {
      let response = await apiAxios.get('/api/v1/me/', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data;

      return {
        profile: {
          id: user.id,
          email: user.email,
          name: [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined,
          imageUrl: user.image
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Close API key. Create one in Settings > Developer > API Keys.')
    }),

    getOutput: async (ctx: { input: { apiKey: string } }) => {
      return {
        output: {
          token: ctx.input.apiKey,
          authType: 'api_key' as const
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; authType: string };
      input: { apiKey: string };
    }) => {
      let basicToken = btoa(`${ctx.output.token}:`);
      let response = await apiAxios.get('/api/v1/me/', {
        headers: {
          Authorization: `Basic ${basicToken}`
        }
      });

      let user = response.data;

      return {
        profile: {
          id: user.id,
          email: user.email,
          name: [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined,
          imageUrl: user.image
        }
      };
    }
  });
