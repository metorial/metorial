import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      username: z.string()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'token'
      });

      return {
        url: `https://www.beeminder.com/apps/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      return {
        output: {
          token: ctx.code,
          username: 'me'
        }
      };
    },

    getProfile: async (ctx: { output: { token: string; username: string } }) => {
      let http = createAxios({
        baseURL: 'https://www.beeminder.com/api/v1'
      });

      let response = await http.get('/users/me.json', {
        params: { access_token: ctx.output.token }
      });

      return {
        profile: {
          id: response.data.username,
          name: response.data.username,
          email: response.data.email
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Auth Token',
    key: 'personal_token',

    inputSchema: z.object({
      token: z.string(),
      username: z.string()
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          username: ctx.input.username
        }
      };
    },

    getProfile: async (ctx: { output: { token: string; username: string } }) => {
      let http = createAxios({
        baseURL: 'https://www.beeminder.com/api/v1'
      });

      let response = await http.get(`/users/${ctx.output.username}.json`, {
        params: { auth_token: ctx.output.token }
      });

      return {
        profile: {
          id: response.data.username,
          name: response.data.username,
          email: response.data.email
        }
      };
    }
  });
