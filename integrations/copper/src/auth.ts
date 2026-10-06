import {
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { authHeaders, Client, type CopperAuth } from './lib/client';
import { copperError } from './lib/contracts';

let authAxios = createAuthenticatedAxios({
  baseURL: 'https://app.copper.com',
  timeout: 30000,
  maxRedirects: 0,
  contentType: 'application/x-www-form-urlencoded',
  errorAdapter: copperError
});

const getProfile = async (output: CopperAuth) => {
  const client = new Client(output);
  const account = await client.getAccount();
  const user = await client.getApiUser();
  if (typeof account.name !== 'string' || typeof user.email !== 'string' || !user.email.trim())
    throw createApiServiceError(
      'Copper returned incomplete account or API-user identity. Reconnect the intended user.'
    );
  if (
    output.authMethod === 'api_key' &&
    user.email.toLowerCase() !== output.userEmail?.toLowerCase()
  )
    throw createApiServiceError(
      'The API key belongs to a different user. Supply its owner email.'
    );
  return { profile: { id: String(account.id), name: account.name, email: user.email } };
};

let outputSchema = z.object({
  token: z.string(),
  userEmail: z.string().optional(),
  authMethod: z.enum(['api_key', 'oauth'])
});

type AuthOutput = z.infer<typeof outputSchema>;

export let auth = SlateAuth.create()
  .output(outputSchema)
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z.string().describe('Your Copper API key (found in Settings > API Credentials)'),
      userEmail: z.string().describe('The email address of the user who generated the API key')
    }),

    getOutput: async ctx => {
      authHeaders({ ...ctx.input, authMethod: 'api_key' });
      return {
        output: {
          token: ctx.input.token,
          userEmail: ctx.input.userEmail,
          authMethod: 'api_key' as const
        }
      };
    },

    getProfile: async (ctx: {
      output: AuthOutput;
      input: { token: string; userEmail: string };
    }) => getProfile(ctx.output)
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developer.copper.com/introduction/oauth/index.html'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developer.copper.com/introduction/oauth/flow.html'
      }
    ],

    scopes: [
      {
        title: 'Full Access',
        description: 'Full read and write access to all Copper resources',
        scope: 'developer/v1/all'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `https://app.copper.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      const response = await authAxios.post(
        '/oauth/token',
        new URLSearchParams({
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri,
          grant_type: 'authorization_code'
        }).toString()
      );
      if (
        !isApiErrorRecord(response.data) ||
        typeof response.data.access_token !== 'string' ||
        !response.data.access_token.trim() ||
        String(response.data.token_type).toLowerCase() !== 'bearer'
      )
        throw createApiServiceError(
          'Copper did not return a valid Bearer access token. Reauthorize the connection.'
        );
      // Copper documents non-expiring access tokens without refresh tokens.

      return {
        output: {
          token: response.data.access_token,
          userEmail: undefined,
          authMethod: 'oauth' as const
        }
      };
    },

    getProfile: async (ctx: { output: AuthOutput; input: {}; scopes: string[] }) =>
      getProfile(ctx.output)
  });
