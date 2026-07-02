import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let apiAxios = createAxios({
  baseURL: 'https://api.bufferapp.com/1'
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
        url: 'https://developers.buffer.com/guides/authentication.html'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.buffer.com/guides/authentication.html#scopes'
      }
    ],

    // Buffer does not use specific OAuth scopes - the access token grants full access
    scopes: [
      {
        title: 'Full Access',
        description: 'Full read and write access to your Buffer account',
        scope: 'full'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code'
      });

      return {
        url: `https://bufferapp.com/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await apiAxios.post('/oauth2/token.json', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri,
        code: ctx.code,
        grant_type: 'authorization_code'
      });

      return {
        output: {
          token: response.data.access_token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      let response = await apiAxios.get('/user.json', {
        params: { access_token: ctx.output.token }
      });

      let user = response.data;

      return {
        profile: {
          id: user.id,
          name: user.name,
          email: user.email,
          imageUrl: user.avatar
        }
      };
    }
  });
