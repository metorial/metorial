import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let oauthAxios = createAxios({
  baseURL: 'https://oauth2.bitquery.io'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      apiVersion: z
        .enum(['v1', 'v2'])
        .describe('Which API version this token authenticates for')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key (V1)',
    key: 'api_key_v1',
    inputSchema: z.object({
      apiKey: z.string().describe('Your Bitquery V1 API key from the account dashboard')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          apiVersion: 'v1' as const
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Bearer Token (V2)',
    key: 'bearer_token_v2',
    inputSchema: z.object({
      bearerToken: z
        .string()
        .describe('Your Bitquery V2 OAuth Bearer token (starts with ory_...)')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.bearerToken,
          apiVersion: 'v2' as const
        }
      };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth2 Client Credentials (V2)',
    key: 'oauth2_v2',
    scopes: [
      {
        title: 'API Access',
        description: 'Full access to Bitquery streaming API',
        scope: 'api'
      }
    ],
    getAuthorizationUrl: async ctx => {
      // Client credentials flow doesn't use an authorization URL in the traditional sense.
      // We generate the token directly and redirect back.
      let response = await oauthAxios.post(
        '/oauth2/token',
        `grant_type=client_credentials&client_id=${encodeURIComponent(ctx.clientId)}&client_secret=${encodeURIComponent(ctx.clientSecret)}&scope=${encodeURIComponent(ctx.scopes.join(' '))}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let redirectUrl = new URL(ctx.redirectUri);
      redirectUrl.searchParams.set('state', ctx.state);
      redirectUrl.searchParams.set('code', response.data.access_token);

      return {
        url: redirectUrl.toString()
      };
    },
    handleCallback: async ctx => {
      // The code passed here is already the access token from getAuthorizationUrl
      return {
        output: {
          token: ctx.code,
          apiVersion: 'v2' as const
        }
      };
    },
    handleTokenRefresh: async (ctx: any) => {
      let response = await oauthAxios.post(
        '/oauth2/token',
        `grant_type=client_credentials&client_id=${encodeURIComponent(ctx.clientId)}&client_secret=${encodeURIComponent(ctx.clientSecret)}&scope=${encodeURIComponent(ctx.scopes.join(' '))}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        output: {
          token: response.data.access_token,
          apiVersion: 'v2' as const
        }
      };
    }
  });
