import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let apiAxios = createAxios({
  baseURL: 'https://foursquare.com'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z.string().describe('Foursquare API Key from the Developer Console')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth',
    scopes: [],
    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri
      });
      return {
        url: `https://foursquare.com/oauth2/authenticate?${params.toString()}`
      };
    },
    handleCallback: async ctx => {
      let response = await apiAxios.get('/oauth2/access_token', {
        params: {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: ctx.redirectUri,
          code: ctx.code
        }
      });
      return {
        output: {
          token: response.data.access_token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      let placesAxios = createAxios({
        baseURL: 'https://api.foursquare.com/v2'
      });
      let response = await placesAxios.get('/users/self', {
        params: {
          oauth_token: ctx.output.token,
          v: '20231010'
        }
      });
      let user = response.data.response?.user;
      return {
        profile: {
          id: user?.id,
          name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          email: user?.contact?.email,
          imageUrl: user?.photo
            ? `${user.photo.prefix}original${user.photo.suffix}`
            : undefined
        }
      };
    }
  });
