import { createAxios, normalizeOAuthTokenResponse, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client, safeDripFailure } from './lib/client';

type AuthOutput = { token: string; tokenType: 'bearer' | 'basic' };
const getProfile = async (ctx: { output: AuthOutput }) => {
  const result = await new Client(ctx.output).fetchUser();
  const user = result.users[0];
  return { profile: { id: user.email, email: user.email, name: user.name } };
};

export const auth = SlateAuth.create()
  .output(z.object({ token: z.string(), tokenType: z.enum(['bearer', 'basic']) }))
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    scopes: [
      {
        title: 'Public',
        description: 'Access the authorized user’s Drip accounts.',
        scope: 'public'
      }
    ],
    getAuthorizationUrl: async ctx => {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });
      if (ctx.scopes.length) params.set('scope', ctx.scopes.join(' '));
      return { url: `https://www.getdrip.com/oauth/authorize?${params}` };
    },
    handleCallback: async ctx => {
      try {
        const http = createAxios({
          baseURL: 'https://www.getdrip.com',
          timeout: 45000,
          maxRedirects: 0
        });
        const response = await http.post('/oauth/token', null, {
          params: {
            response_type: 'token',
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            code: ctx.code,
            redirect_uri: ctx.redirectUri,
            grant_type: 'authorization_code'
          }
        });
        const normalized = normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'Drip'
        });
        // Drip explicitly documents nonexpiring tokens and no refresh flow.
        return { output: { token: normalized.token, tokenType: 'bearer' as const } };
      } catch (error) {
        throw safeDripFailure(error);
      }
    },
    getProfile
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      apiToken: z
        .string()
        .describe(
          'Personal API token from Drip User Settings > API Token. Private integrations only.'
        )
    }),
    getOutput: async ctx => {
      const output: AuthOutput = { token: ctx.input.apiToken.trim(), tokenType: 'basic' };
      new Client(output);
      return { output };
    },
    getProfile
  });
