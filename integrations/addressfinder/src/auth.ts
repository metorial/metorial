import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      secret: z.string().optional(),
      authMethod: z.enum(['api_key', 'oauth2'])
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key + Secret',
    key: 'api_key_secret',
    inputSchema: z.object({
      apiKey: z.string().describe('Your Addressfinder API Key (found in Portal credentials)'),
      apiSecret: z
        .string()
        .describe('Your Addressfinder API Secret (found in Portal credentials)')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          secret: ctx.input.apiSecret,
          authMethod: 'api_key' as const
        }
      };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth2 Client Credentials',
    key: 'oauth2',
    scopes: [
      {
        title: 'Address',
        description:
          'Access to address autocomplete, verification, metadata, location, and geocoding APIs',
        scope: 'address'
      },
      {
        title: 'Email',
        description: 'Access to email verification API',
        scope: 'email'
      },
      {
        title: 'Phone',
        description: 'Access to phone verification API',
        scope: 'phone'
      }
    ],
    getAuthorizationUrl: async ctx => {
      // OAuth2 client credentials flow doesn't use an authorization URL with user redirect.
      // We return a dummy URL; the actual token exchange happens in handleCallback.
      // However, the Slates framework expects a URL, so we provide the token endpoint.
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });
      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(' '));
      }
      return {
        url: `https://api.addressfinder.io/oauth/authorize?${params.toString()}`
      };
    },
    handleCallback: async ctx => {
      let axios = createAxios({ baseURL: 'https://api.addressfinder.io' });

      let params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret
      });
      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(' '));
      }
      params.set('expires_in', '3600');

      let response = await axios.post('/oauth/token', params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      return {
        output: {
          token: response.data.access_token,
          secret: undefined,
          authMethod: 'oauth2' as const
        }
      };
    },
    handleTokenRefresh: async (ctx: any) => {
      let axios = createAxios({ baseURL: 'https://api.addressfinder.io' });

      let params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret
      });
      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(' '));
      }
      params.set('expires_in', '3600');

      let response = await axios.post('/oauth/token', params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      return {
        output: {
          token: response.data.access_token,
          secret: undefined,
          authMethod: 'oauth2' as const
        }
      };
    }
  });
