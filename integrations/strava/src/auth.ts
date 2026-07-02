import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let authAxios = createAxios({
  baseURL: 'https://www.strava.com'
});

let apiAxios = createAxios({
  baseURL: 'https://www.strava.com/api/v3'
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
        title: 'Read Public Data',
        description:
          'Read public segments, public routes, public profile data, public posts, public events, club feeds, and leaderboards',
        scope: 'read'
      },
      {
        title: 'Read All Private Data',
        description: 'Read private routes, private segments, and private events for the user',
        scope: 'read_all'
      },
      {
        title: 'Read Full Profile',
        description:
          'Read all profile information even if the user has set their profile visibility to Followers or Only You',
        scope: 'profile:read_all'
      },
      {
        title: 'Write Profile',
        description:
          "Update the user's weight and FTP, and star/unstar segments on their behalf",
        scope: 'profile:write'
      },
      {
        title: 'Read Activities',
        description:
          'Read activity data for activities visible to Everyone and Followers, excluding privacy zone data',
        scope: 'activity:read'
      },
      {
        title: 'Read All Activities',
        description:
          'Read all activity data including privacy zone data and Only You activities',
        scope: 'activity:read_all'
      },
      {
        title: 'Write Activities',
        description:
          'Create manual activities and uploads, edit activities visible to the app',
        scope: 'activity:write'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        approval_prompt: 'auto',
        scope: ctx.scopes.join(','),
        state: ctx.state
      });

      return {
        url: `https://www.strava.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await authAxios.post('/oauth/token', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        grant_type: 'authorization_code'
      });

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_at
            ? new Date(data.expires_at * 1000).toISOString()
            : undefined
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let response = await authAxios.post('/oauth/token', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken
      });

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_at
            ? new Date(data.expires_at * 1000).toISOString()
            : undefined
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: Record<string, never>;
      scopes: string[];
    }) => {
      let response = await apiAxios.get('/athlete', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let athlete = response.data;

      return {
        profile: {
          id: String(athlete.id),
          name: `${athlete.firstname || ''} ${athlete.lastname || ''}`.trim(),
          imageUrl: athlete.profile || undefined,
          email: undefined,
          username: athlete.username,
          city: athlete.city,
          state: athlete.state,
          country: athlete.country
        }
      };
    }
  });
