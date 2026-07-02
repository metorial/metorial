import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z.string().describe('Shippo API token (starts with shippo_live_ or shippo_test_)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let axios = createAxios({
        baseURL: 'https://api.goshippo.com'
      });

      let _response = await axios.get('/addresses', {
        headers: {
          Authorization: `ShippoToken ${ctx.output.token}`,
          'Content-Type': 'application/json'
        },
        params: { results: 1 }
      });

      return {
        profile: {
          id: 'shippo-user',
          name: 'Shippo Account'
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
        title: 'Full Access',
        description: 'Full read and write access to all Shippo resources',
        scope: '*'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        scope: ctx.scopes.join(' '),
        state: ctx.state,
        redirect_uri: ctx.redirectUri
      });

      return {
        url: `https://goshippo.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let axios = createAxios({
        baseURL: 'https://goshippo.com'
      });

      let response = await axios.post('/oauth/access_token', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        grant_type: 'authorization_code'
      });

      let data = response.data as { access_token: string };

      return {
        output: {
          token: data.access_token
        }
      };
    }
  });
