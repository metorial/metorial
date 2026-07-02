import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let axios = createAxios({
  baseURL: 'https://api.clickup.com/api/v2'
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
        url: 'https://developer.clickup.com/docs/authentication'
      }
    ],

    scopes: [],

    getAuthorizationUrl: async ctx => {
      let url = `https://app.clickup.com/api?client_id=${encodeURIComponent(ctx.clientId)}&redirect_uri=${encodeURIComponent(ctx.redirectUri)}&state=${encodeURIComponent(ctx.state)}`;
      return { url };
    },

    handleCallback: async ctx => {
      let response = await axios.post('https://api.clickup.com/api/v2/oauth/token', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code
      });

      return {
        output: {
          token: response.data.access_token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await axios.get('https://api.clickup.com/api/v2/user', {
        headers: {
          Authorization: ctx.output.token
        }
      });

      let user = response.data.user;
      return {
        profile: {
          id: String(user.id),
          name: user.username,
          email: user.email,
          imageUrl: user.profilePicture
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal API Token',
    key: 'personal_token',

    inputSchema: z.object({
      token: z.string().describe('Personal API Token from ClickUp Settings > Apps')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await axios.get('https://api.clickup.com/api/v2/user', {
        headers: {
          Authorization: ctx.output.token
        }
      });

      let user = response.data.user;
      return {
        profile: {
          id: String(user.id),
          name: user.username,
          email: user.email,
          imageUrl: user.profilePicture
        }
      };
    }
  });
