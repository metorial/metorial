import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { calComApiError, calComServiceError } from './lib/errors';

let tokenHttp = createAxios({
  baseURL: 'https://api.cal.com/v2'
});

let tokenExpiresAt = (expiresIn: unknown) => {
  let seconds = typeof expiresIn === 'number' && Number.isFinite(expiresIn) ? expiresIn : 1800;
  return new Date(Date.now() + seconds * 1000).toISOString();
};

let exchangeOAuthToken = async (body: Record<string, unknown>, operation: string) => {
  try {
    let response = await tokenHttp.post('/auth/oauth2/token', body, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    let data = response.data;

    if (!data?.access_token) {
      throw calComServiceError(
        'Cal.com OAuth token response did not include an access token.'
      );
    }

    return data;
  } catch (error) {
    throw calComApiError(error, operation);
  }
};

let getProfileFromToken = async (token: string, operation: string) => {
  let http = createAxios({
    baseURL: 'https://api.cal.com/v2',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  try {
    let response = await http.get('/me');
    let user = response.data?.data;

    if (!user?.id && !user?.email) {
      throw calComServiceError('Cal.com profile response did not include a user id or email.');
    }

    return {
      profile: {
        id: user?.id?.toString(),
        email: user?.email,
        name: user?.name,
        imageUrl: user?.avatarUrl
      }
    };
  } catch (error) {
    throw calComApiError(error, operation);
  }
};

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
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://cal.com/docs/api-reference/v2/oauth'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://cal.com/docs/api-reference/v2/oauth#available-scopes'
      }
    ],

    scopes: [
      {
        title: 'Read Profile',
        description: 'Read the authenticated Cal.com user profile',
        scope: 'PROFILE_READ'
      },
      {
        title: 'Read Bookings',
        description: 'List and inspect bookings, booking references, and calendar links',
        scope: 'BOOKING_READ'
      },
      {
        title: 'Write Bookings',
        description: 'Create bookings and manage booking lifecycle actions',
        scope: 'BOOKING_WRITE'
      },
      {
        title: 'Read Event Types',
        description: 'List and inspect event types',
        scope: 'EVENT_TYPE_READ'
      },
      {
        title: 'Write Event Types',
        description: 'Create, update, and delete event types',
        scope: 'EVENT_TYPE_WRITE'
      },
      {
        title: 'Read Schedules',
        description: 'Read availability schedules and out-of-office entries',
        scope: 'SCHEDULE_READ'
      },
      {
        title: 'Write Schedules',
        description: 'Create, update, and delete schedules and out-of-office entries',
        scope: 'SCHEDULE_WRITE'
      },
      {
        title: 'Read Connected Apps',
        description: 'Read calendars, busy times, and connected conferencing apps',
        scope: 'APPS_READ'
      },
      {
        title: 'Read Webhooks',
        description: 'Read Cal.com webhooks registered by this integration',
        scope: 'WEBHOOK_READ'
      },
      {
        title: 'Write Webhooks',
        description: 'Create, update, and delete Cal.com webhooks for triggers',
        scope: 'WEBHOOK_WRITE'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `https://app.cal.com/auth/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let data = await exchangeOAuthToken(
        {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        },
        'exchange OAuth code'
      );

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: tokenExpiresAt(data.expires_in)
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw calComServiceError('No Cal.com refresh token available.');
      }

      let data = await exchangeOAuthToken(
        {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        },
        'refresh OAuth token'
      );

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt: tokenExpiresAt(data.expires_in)
        }
      };
    },

    getProfile: async (ctx: any) => {
      return await getProfileFromToken(ctx.output.token, 'get OAuth profile');
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z.string().describe('Cal.com API key (starts with cal_ or cal_live_)')
    }),

    getOutput: async ctx => {
      let apiKey = ctx.input.apiKey.trim();
      if (!apiKey) throw calComServiceError('Cal.com API key is required.');

      return {
        output: {
          token: apiKey
        }
      };
    },

    getProfile: async (ctx: any) => {
      return await getProfileFromToken(ctx.output.token, 'get API key profile');
    }
  });
