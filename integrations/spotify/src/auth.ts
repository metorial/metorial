import {
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { SpotifyClient } from './lib/client';
import { protect, spotifyError } from './lib/validation';

async function exchange(
  clientId: string,
  clientSecret: string,
  fields: Record<string, string>,
  previous?: string
) {
  if (!clientId || !clientSecret)
    throw createApiServiceError(
      'Configure the Spotify OAuth client and secret before connecting.'
    );
  const axios = createAuthenticatedAxios({
    baseURL: 'https://accounts.spotify.com',
    authHeader: {
      value: `Basic ${Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64')}`
    },
    contentType: 'application/x-www-form-urlencoded',
    maxRedirects: 0,
    timeout: 30000,
    maxContentLength: 1024 * 1024,
    errorMapping: {
      extractResponseData: response => ({
        error: { status: response.status, message: 'Spotify authorization was rejected.' }
      })
    },
    errorAdapter: error => spotifyError(error)
  });
  try {
    const response = await axios.post<unknown>(
      '/api/token',
      new URLSearchParams(fields).toString()
    );
    if (response.status !== 200)
      throw createApiServiceError(
        'Spotify returned an unexpected authorization status. Reconnect before retrying.'
      );
    const schema = z.object({
      access_token: z.string().min(1),
      refresh_token: z.string().min(1).optional(),
      expires_in: z.number().int().positive().max(31536000),
      token_type: z.string().regex(/^Bearer$/i)
    });
    const parsed = schema.safeParse(response.data);
    if (!parsed.success)
      throw createApiServiceError(
        'Spotify returned incomplete authorization credentials or expiry. Reconnect the account.'
      );
    const raw = response.data as Record<string, unknown>;
    const extras = Object.fromEntries(
      Object.entries(raw).filter(([key]) => !['access_token', 'refresh_token'].includes(key))
    );
    protect(
      { extras, headers: response.headers },
      [
        clientSecret,
        fields.code ?? fields.refresh_token ?? '',
        parsed.data.access_token,
        parsed.data.refresh_token ?? '',
        previous ?? ''
      ].filter(v => v.length > 0)
    );
    return normalizeOAuthTokenResponse(parsed.data, {
      providerLabel: 'Spotify',
      previousRefreshToken: previous,
      required: true,
      expiresInType: 'number'
    });
  } catch (error) {
    throw spotifyError(error);
  }
}
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
    name: 'Spotify OAuth',
    key: 'spotify_oauth',
    scopes: [
      {
        title: 'Read Playback State',
        description: 'Read access to the current playback state and available devices',
        scope: 'user-read-playback-state'
      },
      {
        title: 'Modify Playback State',
        description: 'Control playback on Spotify clients (play, pause, skip, etc.)',
        scope: 'user-modify-playback-state'
      },
      {
        title: 'Read Currently Playing',
        description: 'Read access to the currently playing track or episode',
        scope: 'user-read-currently-playing'
      },
      {
        title: 'Read Private Playlists',
        description: "Read access to the user's private playlists",
        scope: 'playlist-read-private'
      },
      {
        title: 'Read Collaborative Playlists',
        description: 'Read access to collaborative playlists',
        scope: 'playlist-read-collaborative'
      },
      {
        title: 'Modify Private Playlists',
        description: "Create and modify the user's private playlists",
        scope: 'playlist-modify-private'
      },
      {
        title: 'Modify Public Playlists',
        description: "Create and modify the user's public playlists",
        scope: 'playlist-modify-public'
      },
      {
        title: 'Manage Following',
        description: 'Follow and unfollow artists, users, and playlists',
        scope: 'user-follow-modify'
      },
      {
        title: 'Read Following',
        description: 'Read access to the list of artists and users the user follows',
        scope: 'user-follow-read'
      },
      {
        title: 'Read Top Items',
        description: "Read access to the user's top artists and tracks",
        scope: 'user-top-read'
      },
      {
        title: 'Read Recently Played',
        description: "Read access to the user's recently played items",
        scope: 'user-read-recently-played'
      },
      {
        title: 'Modify Library',
        description: "Save and remove items from the user's library",
        scope: 'user-library-modify'
      },
      {
        title: 'Read Library',
        description: "Read access to the user's saved items in their library",
        scope: 'user-library-read'
      },
      {
        title: 'Read Email',
        description: "Read access to the user's email address",
        scope: 'user-read-email'
      },
      {
        title: 'Read Private Profile',
        description: "Read access to the user's private profile information",
        scope: 'user-read-private'
      }
    ],
    getAuthorizationUrl: async ctx => ({
      url: `https://accounts.spotify.com/authorize?${new URLSearchParams({ client_id: ctx.clientId, response_type: 'code', redirect_uri: ctx.redirectUri, state: ctx.state, scope: ctx.scopes.join(' ') })}`
    }),
    handleCallback: async ctx => ({
      output: await exchange(ctx.clientId, ctx.clientSecret, {
        grant_type: 'authorization_code',
        code: ctx.code,
        redirect_uri: ctx.redirectUri
      })
    }),
    handleTokenRefresh: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken)
        throw createApiServiceError('No refresh token is available. Reconnect Spotify.');
      return {
        output: await exchange(
          ctx.clientId,
          ctx.clientSecret,
          { grant_type: 'refresh_token', refresh_token: ctx.output.refreshToken },
          ctx.output.refreshToken
        )
      };
    },
    getProfile: async (ctx: { output: { token: string; refreshToken?: string } }) => {
      const data = await new SpotifyClient({
        token: ctx.output.token,
        refreshToken: ctx.output.refreshToken
      }).getCurrentUser();
      return {
        profile: {
          id: data.account_id ?? data.id,
          name: data.display_name ?? undefined,
          email: data.email,
          imageUrl: data.images?.[0]?.url
        }
      };
    }
  });
