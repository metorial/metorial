import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

let authAxios = createAxios({ baseURL: 'https://ticktick.com/oauth' });

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
        title: 'Read Tasks',
        description: 'Read access to tasks, projects, and related data',
        scope: 'tasks:read'
      },
      {
        title: 'Write Tasks',
        description: 'Create, update, complete, move, and delete tasks and projects',
        scope: 'tasks:write'
      }
    ],
    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state
      });
      return { url: `https://ticktick.com/oauth/authorize?${params.toString()}` };
    },
    handleCallback: async ctx => {
      try {
        let response = await authAxios.post(
          '/token',
          new URLSearchParams({
            grant_type: 'authorization_code',
            code: ctx.code,
            redirect_uri: ctx.redirectUri,
            scope: ctx.scopes.join(' ')
          }).toString(),
          {
            auth: { username: ctx.clientId, password: ctx.clientSecret },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }
        );
        return {
          output: normalizeOAuthTokenResponse(response.data, {
            providerLabel: 'TickTick',
            operation: 'token exchange'
          })
        };
      } catch (error) {
        throw buildApiServiceError(error, {
          providerLabel: 'TickTick',
          operation: 'token exchange',
          reason: 'ticktick_oauth_error'
        });
      }
    },
    handleTokenRefresh: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'TickTick did not provide a refresh token. Reconnect your account to authorize access again.',
          { reason: 'missing_refresh_token' }
        );
      }
      // Preserve refresh support for connections that already hold a refresh token.
      // The current Open API reference only documents the authorization-code grant.
      try {
        let response = await authAxios.post(
          '/token',
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: ctx.output.refreshToken
          }).toString(),
          {
            auth: { username: ctx.clientId, password: ctx.clientSecret },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }
        );
        return {
          output: normalizeOAuthTokenResponse(response.data, {
            providerLabel: 'TickTick',
            operation: 'token refresh',
            previousRefreshToken: ctx.output.refreshToken
          })
        };
      } catch (error) {
        throw buildApiServiceError(error, {
          providerLabel: 'TickTick',
          operation: 'token refresh',
          reason: 'ticktick_oauth_error'
        });
      }
    },
    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
    }) => {
      let user = await new Client({ token: ctx.output.token }).getUserProfile();
      return {
        profile: {
          id: user.id,
          name: user.name ?? user.username,
          email: user.email ?? undefined
        }
      };
    }
  });
