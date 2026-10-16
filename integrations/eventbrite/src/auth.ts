import {
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { Client, eventbriteApiError } from './lib/client';

let api = createAuthenticatedAxios({
  baseURL: 'https://www.eventbriteapi.com/v3',
  timeout: 30_000,
  errorAdapter: eventbriteApiError
});

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
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://www.eventbrite.com/platform/docs/app-oauth-flow'
      }
    ],

    scopes: [],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      return {
        url: `https://www.eventbrite.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: ctx.code,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri
      });

      let response = await api.post(
        'https://www.eventbrite.com/oauth/token',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        output: {
          token: normalizeOAuthTokenResponse(response.data, { providerLabel: 'Eventbrite' })
            .token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string } }) => {
      let user = await new Client({ token: ctx.output.token }).getMe();

      return {
        profile: {
          id: user.id,
          email:
            user.emails?.find((email: { primary?: boolean; email?: string }) => email.primary)
              ?.email ?? user.emails?.[0]?.email,
          name: user.name
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal OAuth Token',
    key: 'personal_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Your personal OAuth token from the Eventbrite developer portal.')
    }),

    getOutput: async ctx => {
      if (!ctx.input.token.trim())
        throw createApiServiceError('An Eventbrite access token is required.');
      return {
        output: {
          token: ctx.input.token.trim()
        }
      };
    },

    getProfile: async (ctx: { output: { token: string } }) => {
      let user = await new Client({ token: ctx.output.token }).getMe();

      return {
        profile: {
          id: user.id,
          email:
            user.emails?.find((email: { primary?: boolean; email?: string }) => email.primary)
              ?.email ?? user.emails?.[0]?.email,
          name: user.name
        }
      };
    }
  });
