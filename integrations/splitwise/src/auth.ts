import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let httpClient = createAxios({
  baseURL: 'https://secure.splitwise.com'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth2',

    scopes: [],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state
      });

      return {
        url: `https://secure.splitwise.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await httpClient.post('/oauth/token', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        grant_type: 'authorization_code',
        code: ctx.code,
        redirect_uri: ctx.redirectUri
      });

      return {
        output: {
          token: response.data.access_token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      let response = await httpClient.get('/api/v3.0/get_current_user', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data.user;

      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: [user.first_name, user.last_name].filter(Boolean).join(' '),
          imageUrl: user.picture?.medium
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Splitwise API key from your application settings at secure.splitwise.com')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let response = await httpClient.get('/api/v3.0/get_current_user', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data.user;

      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: [user.first_name, user.last_name].filter(Boolean).join(' '),
          imageUrl: user.picture?.medium
        }
      };
    }
  });
