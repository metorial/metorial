import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Xata API key (starts with "xau_"). Create one in Account Settings.')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token?: string }; input: { apiKey: string } }) => {
      let http = createAxios({
        baseURL: 'https://api.xata.io',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'Content-Type': 'application/json'
        }
      });

      let response = await http.get('/user');
      let user = response.data;

      return {
        profile: {
          id: user.id,
          email: user.email,
          name: user.name,
          imageUrl: user.image
        }
      };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    scopes: [
      {
        title: 'Admin Access',
        description:
          'Full read and write access to all Xata resources (same permissions as an API key).',
        scope: 'admin:all'
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
        url: `https://app.xata.io/integrations/oauth/authorize?${params.toString()}`
      };
    },
    handleCallback: async ctx => {
      let http = createAxios({
        baseURL: 'https://api.xata.io',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      let response = await http.post('/oauth/token', {
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
          expiresAt:
            data.expires_at ||
            (data.expires_in
              ? new Date(Date.now() + data.expires_in * 1000).toISOString()
              : undefined)
        }
      };
    },
    handleTokenRefresh: async (ctx: any) => {
      let http = createAxios({
        baseURL: 'https://api.xata.io',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      let response = await http.post('/oauth/token', {
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
          expiresAt:
            data.expires_at ||
            (data.expires_in
              ? new Date(Date.now() + data.expires_in * 1000).toISOString()
              : undefined)
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      let http = createAxios({
        baseURL: 'https://api.xata.io',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'Content-Type': 'application/json'
        }
      });

      let response = await http.get('/user');
      let user = response.data;

      return {
        profile: {
          id: user.id,
          email: user.email,
          name: user.name,
          imageUrl: user.image
        }
      };
    }
  });
