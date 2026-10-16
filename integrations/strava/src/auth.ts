import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';

let authAxios = createAxios({
  baseURL: 'https://www.strava.com',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
});

let apiAxios = createAxios({
  baseURL: 'https://www.strava.com/api/v3'
});

for (let client of [authAxios, apiAxios]) {
  client.interceptors.response.use(undefined, error => {
    throw buildApiServiceError(error, {
      providerLabel: 'Strava',
      reason: 'strava_api_error',
      extractResponse: (upstream, helpers) => helpers.getResponseWithBody(upstream),
      detailKeys: ['message', 'resource', 'field', 'code'],
      nestedKeys: ['errors']
    });
  });
}

let getScopes = (scope: unknown, fallback: string[]) =>
  typeof scope === 'string' ? scope.split(/[\s,]+/).filter(Boolean) : fallback;

let getExpiry = (expiresAt: unknown, fallback?: string) => {
  if (expiresAt === undefined || expiresAt === null) return fallback;
  let date = typeof expiresAt === 'number' ? new Date(expiresAt * 1000) : undefined;
  if (!date || !Number.isFinite(date.getTime())) {
    throw createApiServiceError('Strava returned an invalid access token expiration.', {
      reason: 'oauth_token_response'
    });
  }
  return date.toISOString();
};

type AuthOutput = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  scopes?: string[];
  athleteId?: number;
  [key: string]: unknown;
};

export let auth = SlateAuth.create()
  .output(
    z
      .object({
        token: z.string(),
        refreshToken: z.string().optional(),
        expiresAt: z.string().optional(),
        scopes: z.array(z.string()).optional(),
        athleteId: z.number().optional()
      })
      .passthrough()
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
      let tokens = normalizeOAuthTokenResponse(data, { providerLabel: 'Strava' });
      let scopes = getScopes(data.scope ?? ctx.callbackParams?.scope, ctx.scopes);

      return {
        output: {
          ...tokens,
          expiresAt: getExpiry(data.expires_at, tokens.expiresAt),
          scopes,
          athleteId: typeof data.athlete?.id === 'number' ? data.athlete.id : undefined
        },
        scopes
      };
    },

    handleTokenRefresh: async (ctx: {
      output: AuthOutput;
      input: Record<string, never>;
      clientId: string;
      clientSecret: string;
      scopes: string[];
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError('Reconnect Strava to obtain a refresh token.', {
          reason: 'missing_refresh_token'
        });
      }
      let response = await authAxios.post('/oauth/token', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken
      });

      let data = response.data;

      let tokens = normalizeOAuthTokenResponse(data, {
        providerLabel: 'Strava',
        operation: 'token refresh',
        previousRefreshToken: ctx.output.refreshToken
      });

      return {
        output: {
          ...ctx.output,
          ...tokens,
          expiresAt: getExpiry(data.expires_at, tokens.expiresAt ?? ctx.output.expiresAt),
          scopes: getScopes(data.scope, ctx.output.scopes ?? ctx.scopes)
        }
      };
    },

    getProfile: async (ctx: {
      output: AuthOutput;
      input: Record<string, never>;
      scopes: string[];
    }) => {
      let response = await apiAxios.get('/athlete', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let athlete = response.data;
      if (typeof athlete.id !== 'number' && typeof athlete.id !== 'string') {
        throw createApiServiceError('Strava did not return an athlete identifier.', {
          reason: 'invalid_athlete_response'
        });
      }

      return {
        profile: {
          id: String(athlete.id),
          name:
            [athlete.firstname, athlete.lastname].filter(Boolean).join(' ') ||
            athlete.username ||
            undefined,
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
