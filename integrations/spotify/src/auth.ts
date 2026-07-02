import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

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
        title: 'Upload Images',
        description: 'Upload custom cover images to playlists',
        scope: 'ugc-image-upload'
      },
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
        title: 'App Remote Control',
        description: 'Remote control playback on Spotify clients',
        scope: 'app-remote-control'
      },
      {
        title: 'Streaming',
        description: 'Stream music via the Spotify SDK',
        scope: 'streaming'
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
        title: 'Read Playback Position',
        description: 'Read access to playback position for audiobooks and podcasts',
        scope: 'user-read-playback-position'
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

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `https://accounts.spotify.com/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let axios = createAxios({ baseURL: 'https://accounts.spotify.com' });

      let response = await axios.post(
        '/api/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${btoa(`${ctx.clientId}:${ctx.clientSecret}`)}`
          }
        }
      );

      let data = response.data as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        token_type: string;
      };

      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw new Error('No refresh token available');
      }

      let axios = createAxios({ baseURL: 'https://accounts.spotify.com' });

      let response = await axios.post(
        '/api/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${btoa(`${ctx.clientId}:${ctx.clientSecret}`)}`
          }
        }
      );

      let data = response.data as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
        token_type: string;
      };

      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: {};
      scopes: string[];
    }) => {
      let axios = createAxios({ baseURL: 'https://api.spotify.com/v1' });

      let response = await axios.get('/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let data = response.data as {
        id: string;
        email?: string;
        display_name?: string;
        images?: Array<{ url: string }>;
        product?: string;
        country?: string;
      };

      return {
        profile: {
          id: data.id,
          email: data.email,
          name: data.display_name,
          imageUrl: data.images?.[0]?.url,
          product: data.product,
          country: data.country
        }
      };
    }
  });
