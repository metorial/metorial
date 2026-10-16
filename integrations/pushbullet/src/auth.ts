import {
  buildApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

let outputSchema = z.object({
  token: z.string()
});

type AuthOutput = z.infer<typeof outputSchema>;

let fetchProfile = async (token: string) => {
  let user = await new Client({ token }).getMe();

  return {
    profile: {
      id: user.iden,
      email: user.email,
      name: user.name ?? user.email,
      imageUrl: user.image_url
    }
  };
};

export let auth = SlateAuth.create()
  .output(outputSchema)
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state
      });
      // Pushbullet documents state as part of the redirect URI, which it echoes unchanged.
      let redirectUri = new URL(ctx.redirectUri);
      redirectUri.searchParams.set('state', ctx.state);
      params.set('redirect_uri', redirectUri.toString());

      return {
        url: `https://www.pushbullet.com/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let http = createAxios({
        baseURL: 'https://api.pushbullet.com',
        timeout: 30_000
      });

      try {
        let response = await http.post('/oauth2/token', {
          grant_type: 'authorization_code',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code
        });
        let data = normalizeOAuthTokenResponse(response.data, { providerLabel: 'Pushbullet' });
        return { output: { token: data.token } };
      } catch (error) {
        throw buildApiServiceError(error, {
          providerLabel: 'Pushbullet',
          reason: 'pushbullet_oauth_error',
          operation: 'token exchange',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error)
        });
      }
    },

    getProfile: async (ctx: { output: AuthOutput }) => {
      return fetchProfile(ctx.output.token);
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Access Token',
    key: 'access_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your Pushbullet access token from https://www.pushbullet.com/#settings/account'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: AuthOutput }) => {
      return fetchProfile(ctx.output.token);
    }
  });
