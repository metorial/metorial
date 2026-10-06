import { createAuthenticatedAxios, normalizeOAuthTokenResponse, SlateAuth } from 'slates';
import { z } from 'zod';
import { RedditAdsClient } from './lib/client';
import {
  id,
  integer,
  invalid,
  optionalText,
  type RedditAuth,
  row,
  safeApiError,
  text
} from './lib/contracts';

const exchange = async (
  clientId: string,
  clientSecret: string,
  form: Record<string, string>,
  previousRefreshToken?: string
) => {
  text(clientId, 'OAuth client ID');
  text(clientSecret, 'OAuth client secret');
  const http = createAuthenticatedAxios({
    baseURL: 'https://www.reddit.com',
    authHeader: {
      value: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    },
    contentType: 'application/x-www-form-urlencoded',
    timeout: 30000,
    maxRedirects: 0,
    errorAdapter: safeApiError
  });
  const response = await http.post(
    '/api/v1/access_token',
    new URLSearchParams(form).toString()
  );
  const data = row(response.data);
  text(data.access_token, 'Returned access token');
  if (data.refresh_token !== undefined && data.refresh_token !== null)
    text(data.refresh_token, 'Returned refresh token');
  const seconds = integer(data.expires_in, 'OAuth expires_in', 1);
  if (
    !Number.isSafeInteger(Date.now() + seconds * 1000) ||
    Date.now() + seconds * 1000 > 8640000000000000
  )
    invalid('Reddit returned an invalid token expiration interval. Reconnect.');
  return normalizeOAuthTokenResponse(data, {
    providerLabel: 'Reddit Ads',
    previousRefreshToken,
    required: true
  });
};
type AuthorizationContext = {
  clientId: string;
  state: string;
  redirectUri: string;
  scopes: string[];
};
type CallbackContext = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};
type RefreshContext = {
  clientId: string;
  clientSecret: string;
  output: RedditAuth & { expiresAt?: string };
};
const authorize = async (ctx: AuthorizationContext) => {
  const url = new URL('https://ads.reddit.com/oauth');
  for (const [key, value] of Object.entries({
    client_id: ctx.clientId,
    response_type: 'code',
    state: ctx.state,
    redirect_uri: ctx.redirectUri,
    duration: 'permanent',
    scope: ctx.scopes.filter(scope => scope !== 'history').join(',')
  }))
    url.searchParams.set(key, value);
  return { url: url.toString() };
};
const callback = async (ctx: CallbackContext, conversions = false) => ({
  output: {
    ...(await exchange(ctx.clientId, ctx.clientSecret, {
      grant_type: 'authorization_code',
      code: text(ctx.code, 'Authorization code'),
      redirect_uri: ctx.redirectUri
    })),
    authKind: 'oauth' as const,
    canSendConversions: conversions,
    ...(conversions ? { conversionApiVersion: 'v3' as const } : {})
  }
});
const refresh = async (ctx: RefreshContext) => {
  if (!ctx.output.refreshToken)
    invalid(
      'No Reddit refresh token is stored. Reconnect with permanent OAuth authorization.'
    );
  return {
    output: {
      ...ctx.output,
      ...(await exchange(
        ctx.clientId,
        ctx.clientSecret,
        {
          grant_type: 'refresh_token',
          refresh_token: text(ctx.output.refreshToken, 'Refresh token')
        },
        ctx.output.refreshToken
      )),
      authKind: 'oauth' as const
    }
  };
};
const profile = async (ctx: { output: RedditAuth }) => {
  const actor = await new RedditAdsClient(ctx.output).getMe();
  const humanName = [optionalText(actor.firstname), optionalText(actor.lastname)]
    .filter(Boolean)
    .join(' ');
  return {
    profile: {
      id: id(actor.id),
      name:
        humanName ||
        optionalText(actor.reddit_username) ||
        `Reddit ${text(actor.type, 'Actor type')} ${id(actor.id)}`,
      email: optionalText(actor.email)
    }
  };
};
export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      pixelId: z.string().optional(),
      authKind: z.enum(['oauth', 'conversion']).optional(),
      conversionApiVersion: z.enum(['v2', 'v3']).optional(),
      canSendConversions: z.boolean().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth',
    scopes: [
      {
        title: 'Ads Read',
        description: 'Read account identity, campaigns, ads, audiences and reporting.',
        scope: 'adsread'
      },
      {
        title: 'Ads Edit',
        description: 'Create and manage advertising resources and custom audiences.',
        scope: 'adsedit'
      }
    ],
    getAuthorizationUrl: authorize,
    handleCallback: (ctx: CallbackContext) => callback(ctx),
    handleTokenRefresh: refresh,
    getProfile: profile
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'Conversion OAuth',
    key: 'oauth_conversions',
    scopes: [
      {
        title: 'Ads Read',
        description:
          'Discover authorized accounts and Pixels and verify conversion setup identity.',
        scope: 'adsread'
      },
      {
        title: 'Ads Conversions',
        description: 'Submit server-side conversion events for authorized Pixels.',
        scope: 'adsconversions'
      }
    ],
    getAuthorizationUrl: authorize,
    handleCallback: (ctx: CallbackContext) => callback(ctx, true),
    handleTokenRefresh: refresh,
    getProfile: profile
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Conversion Access Token',
    key: 'conversion_token',
    inputSchema: z.object({
      conversionToken: z
        .string()
        .describe(
          'Conversion access token generated by a business admin in Events Manager. This credential has no documented identity-read permission.'
        ),
      pixelId: z.string().describe('Pixel ID belonging to the token’s authorized business.'),
      apiVersion: z
        .enum(['v2', 'v3'])
        .optional()
        .describe(
          'CAPI version. New connections default to v3; existing unmarked connections retain v2.'
        )
    }),
    getOutput: async ctx => ({
      output: {
        token: text(ctx.input.conversionToken, 'Conversion access token'),
        pixelId: id(ctx.input.pixelId, 'Pixel ID'),
        authKind: 'conversion' as const,
        conversionApiVersion: ctx.input.apiVersion ?? 'v3',
        canSendConversions: true
      }
    })
  });
