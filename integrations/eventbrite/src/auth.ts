import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let api = createAxios({
  baseURL: 'https://www.eventbriteapi.com/v3'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
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
        url: 'https://www.eventbrite.com/platform/docs/app-oauth-flow'
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
        url: `https://www.eventbrite.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: ctx.code,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri
      });

      let response = await api.post(
        'https://www.eventbrite.com/oauth/token',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        output: {
          token: response.data.access_token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: any; scopes: string[] }) => {
      let response = await api.get('/users/me/', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data;

      return {
        profile: {
          id: user.id,
          email: user.emails?.[0]?.email,
          name: user.name
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal OAuth Token',
    key: 'personal_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Your personal OAuth token from the Eventbrite developer portal.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: any }) => {
      let response = await api.get('/users/me/', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data;

      return {
        profile: {
          id: user.id,
          email: user.emails?.[0]?.email,
          name: user.name
        }
      };
    }
  });
