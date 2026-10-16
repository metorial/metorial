import { createApiServiceError, createAxios, requestAxiosData, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { checkResponse, toSplitwiseError } from './lib/errors';

let httpClient = createAxios({
  baseURL: 'https://secure.splitwise.com',
  timeout: 30000
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth2',

    scopes: [],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state
      });

      return {
        url: `https://secure.splitwise.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await requestAxiosData(
        'token exchange',
        () =>
          httpClient.post('/oauth/token', {
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            grant_type: 'authorization_code',
            code: ctx.code,
            redirect_uri: ctx.redirectUri
          }),
        toSplitwiseError
      );
      checkResponse(response);
      let token = (response as Record<string, unknown>).access_token;
      if (typeof token !== 'string' || !token.trim()) {
        throw createApiServiceError('Splitwise did not return an access token.');
      }

      return {
        output: {
          token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      let user = await new Client({ token: ctx.output.token }).getCurrentUser();
      if (typeof user.id !== 'number')
        throw createApiServiceError('Splitwise did not return a profile ID.');

      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: [user.first_name, user.last_name].filter(Boolean).join(' '),
          imageUrl: user.picture?.medium
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
        .describe('Splitwise API key from your application settings at secure.splitwise.com')
    }),

    getOutput: async ctx => {
      if (!ctx.input.token.trim()) {
        throw createApiServiceError('A Splitwise API key is required.');
      }
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let user = await new Client({ token: ctx.output.token }).getCurrentUser();
      if (typeof user.id !== 'number')
        throw createApiServiceError('Splitwise did not return a profile ID.');

      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: [user.first_name, user.last_name].filter(Boolean).join(' '),
          imageUrl: user.picture?.medium
        }
      };
    }
  });
