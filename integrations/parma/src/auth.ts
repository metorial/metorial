import type { SlateAuthWithOauth } from 'slates';
import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  requestAxiosData,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { ParmaClient } from './lib/client';

let authOutput = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  redirectUri: z.string().optional()
});
type ParmaOAuth = SlateAuthWithOauth<Record<string, never>, z.infer<typeof authOutput>>;

export let auth = SlateAuth.create()
  .output(authOutput)
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    scopes: [
      {
        title: 'Full Access',
        description:
          'Read and write relationships, notes, and user information in the selected Parma workspace',
        scope: 'full'
      }
    ],
    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        response_type: 'code',
        scope: ctx.scopes.map(scope => (scope === 'full_access' ? 'full' : scope)).join(' ')
      });
      return { url: `https://app.parma.ai/oauth/authorize?${params.toString()}` };
    },
    handleCallback: async ctx => {
      let http = createAxios();
      let data = await requestAxiosData(
        'exchange authorization code',
        () =>
          http.post(
            'https://app.parma.ai/oauth/token',
            new URLSearchParams({
              client_id: ctx.clientId,
              client_secret: ctx.clientSecret,
              redirect_uri: ctx.redirectUri,
              grant_type: 'authorization_code',
              code: ctx.code
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          ),
        (error, operation) =>
          buildApiServiceError(error, {
            providerLabel: 'Parma',
            reason: 'parma_api_error',
            operation
          })
      );
      return {
        output: {
          ...normalizeOAuthTokenResponse(data, {
            providerLabel: 'Parma',
            operation: 'authorization code exchange'
          }),
          redirectUri: ctx.redirectUri
        }
      };
    },
    handleTokenRefresh: async (
      ctx: Parameters<NonNullable<ParmaOAuth['handleTokenRefresh']>>[0]
    ) => {
      let { refreshToken, redirectUri } = ctx.output;
      if (!refreshToken || !redirectUri) {
        throw createApiServiceError(
          'Reconnect Parma to obtain a refresh token and the registered redirect URI.'
        );
      }
      let http = createAxios();
      let data = await requestAxiosData(
        'refresh access token',
        () =>
          http.post(
            'https://app.parma.ai/oauth/token',
            new URLSearchParams({
              client_id: ctx.clientId,
              client_secret: ctx.clientSecret,
              redirect_uri: redirectUri,
              grant_type: 'refresh_token',
              refresh_token: refreshToken
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          ),
        (error, operation) =>
          buildApiServiceError(error, {
            providerLabel: 'Parma',
            reason: 'parma_api_error',
            operation
          })
      );
      return {
        output: {
          ...ctx.output,
          ...normalizeOAuthTokenResponse(data, {
            providerLabel: 'Parma',
            operation: 'token refresh',
            previousRefreshToken: ctx.output.refreshToken
          })
        }
      };
    },
    getProfile: async (ctx: Parameters<NonNullable<ParmaOAuth['getProfile']>>[0]) => {
      let user = await new ParmaClient(ctx.output.token).getMe();
      return {
        profile: {
          id: String(user.id),
          email: user.email ?? undefined,
          name: user.name ?? user.full_name ?? undefined,
          imageUrl: user.avatar_url ?? user.image_url ?? undefined
        }
      };
    }
  });
