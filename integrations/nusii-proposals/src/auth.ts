import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let axios = createAxios({
  baseURL: 'https://app.nusii.com'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Read',
        description: 'Read-only access to your Nusii data',
        scope: 'read'
      },
      {
        title: 'Write',
        description: 'Write access to create, update, and delete data (requires read scope)',
        scope: 'write'
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
        url: `https://app.nusii.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await axios.post('/oauth/token', {
        grant_type: 'authorization_code',
        code: ctx.code,
        redirect_uri: ctx.redirectUri,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret
      });

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : undefined
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let response = await axios.post('/oauth/token', {
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret
      });

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : undefined
        }
      };
    },

    getProfile: async (ctx: any) => {
      let apiAxios = createAxios({
        baseURL: 'https://app.nusii.com/api/v2',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Slates Integration (slates.dev)'
        }
      });

      let response = await apiAxios.get('/account/me');
      let account = response.data.data?.attributes || response.data.data || {};

      return {
        profile: {
          id: response.data.data?.id,
          name: account.company || account.name,
          email: account.email
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Your Nusii API token (found in Settings > Integrations & API)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let apiAxios = createAxios({
        baseURL: 'https://app.nusii.com/api/v2',
        headers: {
          Authorization: `Token token=${ctx.output.token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Slates Integration (slates.dev)'
        }
      });

      let response = await apiAxios.get('/account/me');
      let account = response.data.data?.attributes || response.data.data || {};

      return {
        profile: {
          id: response.data.data?.id,
          name: account.company || account.name,
          email: account.email
        }
      };
    }
  });
