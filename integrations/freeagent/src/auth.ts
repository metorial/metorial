import {
  createApiServiceError,
  isApiErrorRecord,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { createFreeAgentHttp, type Environment, getBaseUrl } from './lib/client';

type AuthInput = { environment?: Environment };
type AuthOutput = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  environment?: Environment;
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      environment: z.enum(['production', 'sandbox']).optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    inputSchema: z.object({
      environment: z
        .enum(['production', 'sandbox'])
        .optional()
        .describe(
          'FreeAgent environment for this connection. Defaults to production. Sandbox requires an app registered for the sandbox API.'
        )
    }),
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://dev.freeagent.com/docs/oauth'
      }
    ],
    scopes: [],
    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state
      });
      return {
        url: `${getBaseUrl(ctx.input.environment ?? 'production')}/approve_app?${params}`
      };
    },
    handleCallback: async ctx => {
      let environment = ctx.input.environment ?? 'production';
      let response = await createFreeAgentHttp(environment).post(
        '/token_endpoint',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          auth: { username: ctx.clientId, password: ctx.clientSecret },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );
      let tokens = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'FreeAgent',
        operation: 'authorization',
        required: true
      });
      if (!tokens.refreshToken) {
        throw createApiServiceError(
          'FreeAgent did not return a refresh token. Reconnect the account.'
        );
      }
      return { output: { ...tokens, environment } };
    },
    handleTokenRefresh: async (ctx: {
      input: AuthInput;
      output: AuthOutput;
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'FreeAgent refresh token is missing. Reconnect the account.'
        );
      }
      let environment = ctx.output.environment ?? ctx.input.environment ?? 'production';
      let response = await createFreeAgentHttp(environment).post(
        '/token_endpoint',
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
        output: {
          ...normalizeOAuthTokenResponse(response.data, {
            providerLabel: 'FreeAgent',
            operation: 'refresh',
            required: true,
            previousRefreshToken: ctx.output.refreshToken,
            refreshTokenFallbackMode: 'falsy'
          }),
          environment
        }
      };
    },
    getProfile: async (ctx: { input: AuthInput; output: AuthOutput }) => {
      let environment = ctx.output.environment ?? ctx.input.environment ?? 'production';
      let response = await createFreeAgentHttp(environment, ctx.output.token).get('/users/me');
      let user = response.data?.user;
      if (
        !isApiErrorRecord(user) ||
        typeof user.url !== 'string' ||
        typeof user.email !== 'string'
      ) {
        throw createApiServiceError('FreeAgent did not return a valid current-user profile.');
      }
      return {
        profile: {
          id: user.url,
          email: user.email,
          name: [user.first_name, user.last_name]
            .filter(value => typeof value === 'string')
            .join(' ')
        }
      };
    }
  });
