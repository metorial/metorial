import {
  createApiServiceError,
  isApiErrorRecord,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { WebexClient } from './lib/client';
import { exchangeToken, required } from './lib/http';

export const scopes = [
  'spark:messages_read',
  'spark:messages_write',
  'spark:rooms_read',
  'spark:rooms_write',
  'spark:memberships_read',
  'spark:memberships_write',
  'spark:people_read',
  'meeting:schedules_read',
  'meeting:schedules_write',
  'meeting:recordings_read',
  'spark:teams_read',
  'spark:teams_write'
];
function tokens(data: unknown, previousRefreshToken?: string) {
  if (
    !isApiErrorRecord(data) ||
    typeof data.expires_in !== 'number' ||
    !Number.isFinite(data.expires_in) ||
    data.expires_in <= 0 ||
    !Number.isFinite(new Date(Date.now() + data.expires_in * 1000).getTime())
  )
    throw createApiServiceError('Webex returned an invalid token lifetime. Reconnect.');
  const output = normalizeOAuthTokenResponse(data, {
    providerLabel: 'Webex',
    required: true,
    expiresInType: 'number',
    previousRefreshToken
  });
  required(output.token, 'access token');
  if (output.refreshToken !== undefined) required(output.refreshToken, 'refresh token');
  return output;
}
export const auth = SlateAuth.create()
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
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developer.webex.com/docs/authentication'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developer.webex.com/docs/integration-scopes'
      }
    ],
    scopes: scopes.map(scope => ({
      title: scope,
      description:
        'Authorize the corresponding messaging, space, membership, directory, team or meeting capability. Webex roles and meeting licenses still apply.',
      scope
    })),
    getAuthorizationUrl: async ctx => ({
      url: `https://webexapis.com/v1/authorize?${new URLSearchParams({ client_id: required(ctx.clientId, 'client ID'), response_type: 'code', redirect_uri: ctx.redirectUri, scope: ctx.scopes.join(' '), state: ctx.state })}`
    }),
    handleCallback: async ctx => ({
      output: tokens(
        await exchangeToken({
          grant_type: 'authorization_code',
          client_id: ctx.clientId,
          client_secret: required(ctx.clientSecret, 'client secret'),
          code: required(ctx.code, 'authorization code'),
          redirect_uri: ctx.redirectUri
        })
      )
    }),
    handleTokenRefresh: async (ctx: {
      output: { token: string; refreshToken?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      const refresh = required(
        ctx.output.refreshToken,
        'refresh token; reconnect this OAuth connection if missing'
      );
      return {
        output: tokens(
          await exchangeToken({
            grant_type: 'refresh_token',
            client_id: ctx.clientId,
            client_secret: required(ctx.clientSecret, 'client secret'),
            refresh_token: refresh
          }),
          refresh
        )
      };
    },
    getProfile: async (ctx: { output: { token: string } }) => {
      const person = await new WebexClient({ token: ctx.output.token }).getMe();
      return {
        profile: {
          id: person.id,
          email: person.emails?.[0],
          name: person.displayName,
          imageUrl: person.avatar
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Bot Token',
    key: 'bot_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Webex bot access token. Bot membership and mention restrictions apply; meeting APIs may require a licensed user OAuth connection.'
        )
    }),
    getOutput: async ctx => ({
      output: { token: required(ctx.input.token, 'bot access token') }
    }),
    getProfile: async (ctx: { output: { token: string } }) => {
      const person = await new WebexClient({ token: ctx.output.token }).getMe();
      return {
        profile: {
          id: person.id,
          email: person.emails?.[0],
          name: person.displayName,
          imageUrl: person.avatar
        }
      };
    }
  });
