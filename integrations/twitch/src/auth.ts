import { normalizeOAuthTokenResponse, SlateAuth } from 'slates';
import { z } from 'zod';
import { TwitchClient } from './lib/client';
import { credential, requireValue, safeJson, upstream } from './lib/contracts';
import { createTwitchAxios } from './lib/http';

export const requestedScopes = [
  'user:read:email',
  'channel:manage:broadcast',
  'channel:read:subscriptions',
  'moderator:read:followers',
  'clips:edit',
  'channel:manage:clips',
  'user:write:chat',
  'moderator:manage:announcements',
  'moderator:manage:chat_settings',
  'moderator:manage:banned_users',
  'moderator:manage:chat_messages',
  'moderator:manage:shield_mode',
  'channel:manage:polls',
  'channel:manage:predictions',
  'channel:manage:redemptions',
  'channel:manage:raids',
  'channel:manage:moderators',
  'channel:manage:vips',
  'channel:edit:commercial',
  'moderator:manage:shoutouts'
];
type Output = {
  token: string;
  clientId: string;
  refreshToken?: string;
  expiresAt?: string;
  userId?: string;
};
async function profile(output: Output) {
  const client = new TwitchClient(output.token, output.clientId, output.userId);
  const native = await client.validateToken();
  if (output.userId)
    requireValue(
      native.user_id === output.userId,
      'Twitch returned a different authorized user. Reconnect.'
    );
  if (!native.user_id)
    return {
      profile: { id: native.client_id, name: 'Twitch application (app access token)' }
    };
  const user = await client.getAuthenticatedUser();
  return {
    profile: {
      id: user.id,
      name: user.display_name,
      email: user.email,
      imageUrl: user.profile_image_url,
      login: user.login
    }
  };
}
async function exchange(params: Record<string, string>, previous?: Output) {
  const clientId = credential(params.client_id, 'Client ID');
  const secret = credential(params.client_secret, 'client secret');
  try {
    const client = createTwitchAxios(
      {
        baseURL: 'https://id.twitch.tv/oauth2',
        timeout: 30000,
        maxRedirects: 0,
        maxContentLength: 65536,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        errorMapping: {
          mapAxiosError: () => ({
            message: 'Twitch authentication failed. Reconnect the account.'
          })
        }
      },
      [secret, params.code ?? '', params.refresh_token ?? ''],
      { refresh_token: params.refresh_token }
    );
    const response = await client.post('/token', new URLSearchParams(params).toString());
    safeJson(
      {
        ...response.data,
        refresh_token:
          response.data?.refresh_token === params.refresh_token
            ? undefined
            : response.data?.refresh_token
      },
      [secret, params.code ?? '', params.refresh_token ?? '']
    );
    const parsed = z
      .object({
        access_token: z.string().min(1),
        refresh_token: z.string().min(1).optional(),
        expires_in: z
          .number()
          .int()
          .positive()
          .max(Math.floor((8640000000000000 - Date.now()) / 1000)),
        token_type: z.literal('bearer'),
        scope: z.array(z.string()).optional()
      })
      .safeParse(response.data);
    requireValue(
      response.status === 200 && parsed.success,
      'Twitch returned an invalid token response. Reconnect.'
    );
    credential(parsed.data.access_token);
    if (parsed.data.refresh_token) credential(parsed.data.refresh_token, 'refresh token');
    const output = {
      ...normalizeOAuthTokenResponse(parsed.data, {
        providerLabel: 'Twitch',
        required: true,
        expiresInType: 'number',
        previousRefreshToken: previous?.refreshToken
      }),
      clientId
    };
    const native = await new TwitchClient(output.token, output.clientId).validateToken();
    requireValue(
      native.user_id,
      'OAuth authorization did not return a user token. Reconnect.'
    );
    if (previous?.userId)
      requireValue(
        native.user_id === previous.userId,
        'Twitch refresh changed the authorized user. Reconnect.'
      );
    return { output: { ...output, userId: native.user_id } };
  } catch (error) {
    throw upstream(error, 'authenticate');
  }
}
export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      userId: z.string().optional(),
      clientId: z.string()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'Twitch OAuth',
    key: 'oauth',
    scopes: requestedScopes.map(scope => ({
      scope,
      title: scope,
      description: 'Permission used by the available Twitch channel tools.'
    })),
    getAuthorizationUrl: async ctx => ({
      url: `https://id.twitch.tv/oauth2/authorize?${new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state,
        force_verify: 'true'
      })}`
    }),
    handleCallback: async ctx =>
      exchange({
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        grant_type: 'authorization_code',
        redirect_uri: ctx.redirectUri
      }),
    handleTokenRefresh: async (ctx: {
      output: Output;
      clientId: string;
      clientSecret: string;
    }) => {
      requireValue(
        ctx.output.refreshToken,
        'This Twitch connection has no refresh token. Reconnect with OAuth; app tokens cannot be refreshed by this method.'
      );
      requireValue(
        ctx.clientId === ctx.output.clientId,
        'Twitch Client ID changed. Reconnect rather than refreshing another application token.'
      );
      return exchange(
        {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        },
        ctx.output
      );
    },
    getProfile: async (ctx: { output: Output }) => profile(ctx.output)
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Access Token',
    key: 'access_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Twitch user or app access token. App grants are supported only by endpoints that permit them.'
        ),
      clientId: z
        .string()
        .describe('Exact registered application Client ID associated with this token')
    }),
    getOutput: async ctx => {
      const client = new TwitchClient(ctx.input.token, ctx.input.clientId);
      const native = await client.validateToken();
      return {
        output: {
          token: ctx.input.token,
          clientId: ctx.input.clientId,
          userId: native.user_id ?? undefined
        }
      };
    },
    getProfile: async (ctx: { output: Output }) => profile(ctx.output)
  });
