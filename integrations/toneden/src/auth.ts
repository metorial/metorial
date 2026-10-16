import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  requestAxiosData,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { ToneDenClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Full Access',
        description: 'Full access to the ToneDen API for the authorized artist profile',
        scope: 'full'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      return {
        url: `https://www.toneden.io/auth/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let axios = createAxios();

      let token = await requestAxiosData<{ access_token?: string }>(
        'exchange authorization code',
        () =>
          axios.post('https://www.toneden.io/auth/oauth2/token', {
            grant_type: 'authorization_code',
            code: ctx.code,
            redirect_uri: ctx.redirectUri,
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret
          }),
        (error, operation) =>
          buildApiServiceError(error, {
            providerLabel: 'ToneDen',
            reason: 'toneden_oauth_error',
            operation,
            extractResponse: (cause, helpers) => helpers.getResponseWithBody(cause)
          })
      );

      if (typeof token.access_token !== 'string' || !token.access_token) {
        throw createApiServiceError(
          'ToneDen did not return an access token. Reauthorize the connection.'
        );
      }

      return {
        output: {
          token: token.access_token
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string };
      input: Record<string, never>;
      scopes: string[];
    }) => {
      let user = await new ToneDenClient({ token: ctx.output.token }).getMe();

      return {
        profile: {
          id: String(user.id),
          name: user.display_name || user.username,
          email: user.email,
          imageUrl: user.avatar_url
        }
      };
    }
  });
