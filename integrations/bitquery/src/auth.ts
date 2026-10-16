import {
  buildApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';

let oauthAxios = createAxios({
  baseURL: 'https://oauth2.bitquery.io'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      expiresAt: z.string().optional(),
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
      let redirectUrl = new URL(ctx.redirectUri);
      redirectUrl.searchParams.set('state', ctx.state);
      redirectUrl.searchParams.set('code', 'client_credentials');
      return { url: redirectUrl.toString() };
    },
    handleCallback: async ctx => ({ output: await issueClientToken(ctx) }),
    handleTokenRefresh: async (ctx: Parameters<typeof issueClientToken>[0]) => ({
      output: await issueClientToken(ctx)
    })
  });

let issueClientToken = async (ctx: {
  clientId: string;
  clientSecret: string;
  scopes: string[];
}) => {
  try {
    let response = await oauthAxios.post(
      '/oauth2/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        scope: ctx.scopes.join(' ')
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    let tokens = normalizeOAuthTokenResponse(response.data, {
      providerLabel: 'Bitquery',
      required: true
    });
    return { token: tokens.token, expiresAt: tokens.expiresAt, apiVersion: 'v2' as const };
  } catch (error) {
    throw buildApiServiceError(error, {
      providerLabel: 'Bitquery',
      operation: 'token exchange',
      reason: 'bitquery_oauth_error',
      extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
    });
  }
};
