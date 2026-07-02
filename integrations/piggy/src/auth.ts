import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Bearer token for API authentication')
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth (Client Credentials)',
    key: 'oauth_client_credentials',

    scopes: [],

    inputSchema: z.object({
      clientId: z.string().describe('OAuth Client ID'),
      clientSecret: z.string().describe('OAuth Client Secret')
    }),

    getAuthorizationUrl: async ctx => {
      // Client credentials flow does not have a user-facing authorization URL.
      // We handle token acquisition in handleCallback directly.
      // Return a redirect back to our own callback URL with the state.
      let url = `${ctx.redirectUri}?code=client_credentials&state=${encodeURIComponent(ctx.state)}`;
      return { url };
    },

    handleCallback: async ctx => {
      let api = createAxios({ baseURL: 'https://api.piggy.eu' });

      let response = await api.post('/oauth/token', {
        grant_type: 'client_credentials',
        client_id: ctx.input.clientId,
        client_secret: ctx.input.clientSecret
      });

      let tokenData = response.data;

      return {
        output: {
          token: tokenData.access_token
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let api = createAxios({ baseURL: 'https://api.piggy.eu' });

      let response = await api.post('/oauth/token', {
        grant_type: 'client_credentials',
        client_id: ctx.input.clientId,
        client_secret: ctx.input.clientSecret
      });

      let tokenData = response.data;

      return {
        output: {
          token: tokenData.access_token
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Personal Access Token or Register API key from the Piggy dashboard')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
