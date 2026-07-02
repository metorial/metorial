import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let oauthAxios = createAxios({
  baseURL: 'https://ahrefs.com'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'Ahrefs Connect (OAuth)',
    key: 'oauth',

    scopes: [
      {
        title: 'API v3 Integration',
        description: 'Full access to Ahrefs API v3 endpoints on behalf of the authorized user',
        scope: 'apiv3-integration-apps'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        scope: ctx.scopes.join(' '),
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      return {
        url: `https://app.ahrefs.com/web/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await oauthAxios.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        }).toString(),
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
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Ahrefs API key (Bearer token). Create one in Account Settings > API keys.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
