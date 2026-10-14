import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

type DartAuthOutput = { token: string; refreshToken?: string; expiresAt?: string };

let api = createAuthenticatedAxios({
  baseURL: 'https://app.dartai.com',
  contentType: false,
  errorAdapter: error =>
    buildApiServiceError(error, {
      providerLabel: 'Dart',
      reason: 'dart_oauth_error'
    })
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    scopes: [
      {
        title: 'Read',
        description: 'View your Dart data',
        scope: 'read'
      },
      {
        title: 'Write',
        description: 'Change your Dart data',
        scope: 'write'
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
        url: `https://app.dartai.com/api/oauth/authorize/?${params.toString()}`
      };
    },
    handleCallback: async ctx => {
      let response = await api.post(
        '/api/oauth/token/',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );
      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'Dart',
          operation: 'token exchange'
        })
      };
    },
    handleTokenRefresh: async (ctx: {
      output: DartAuthOutput;
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'Dart did not provide a refresh token. Reconnect your account.',
          { reason: 'missing_refresh_token' }
        );
      }
      let response = await api.post(
        '/api/oauth/token/',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );
      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'Dart',
          operation: 'token refresh',
          previousRefreshToken: ctx.output.refreshToken
        })
      };
    },
    getProfile: async (ctx: { output: DartAuthOutput }) => {
      let user = await new Client({ token: ctx.output.token }).getCurrentUser();
      return {
        profile: {
          name: user.name,
          email: user.email
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
        .describe('Dart API token (starts with dsa_). Find it at Settings > Account in Dart.')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: { output: DartAuthOutput }) => {
      let user = await new Client({ token: ctx.output.token }).getCurrentUser();
      return {
        profile: {
          name: user.name,
          email: user.email
        }
      };
    }
  });
