import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let http = createAxios({
  baseURL: 'https://api.timelyapp.com/1.1'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional()
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
        url: 'https://dev.timelyapp.com/'
      }
    ],

    scopes: [],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      return {
        url: `https://api.timelyapp.com/1.1/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await http.post('/oauth/token', {
        grant_type: 'authorization_code',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        redirect_uri: ctx.redirectUri
      });

      return {
        output: {
          token: response.data.access_token,
          refreshToken: response.data.refresh_token
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let response = await http.post('/oauth/token', {
        grant_type: 'refresh_token',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        refresh_token: ctx.output.refreshToken
      });

      return {
        output: {
          token: response.data.access_token,
          refreshToken: response.data.refresh_token || ctx.output.refreshToken
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string };
      input: Record<string, never>;
      scopes: string[];
    }) => {
      let accountsRes = await http.get('/accounts', {
        headers: { Authorization: `Bearer ${ctx.output.token}` }
      });

      let accounts = accountsRes.data;
      let accountId = accounts?.[0]?.id;

      if (!accountId) {
        return { profile: {} };
      }

      let userRes = await http.get(`/${accountId}/users/current`, {
        headers: { Authorization: `Bearer ${ctx.output.token}` }
      });

      let user = userRes.data;

      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: user.name,
          imageUrl: user.avatar?.large_retina
        }
      };
    }
  });
