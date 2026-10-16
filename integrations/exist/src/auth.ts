import {
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { Client, existApiError, requireText } from './lib/client';

let http = createAuthenticatedAxios({
  baseURL: 'https://exist.io',
  timeout: 30_000,
  contentType: 'application/x-www-form-urlencoded',
  errorAdapter: existApiError
});

let getConnectionProfile = async (output: { token: string; authType?: string }) => {
  let profile = await new Client(output).getProfile();
  return {
    profile: {
      id: profile.username,
      name: `${profile.first_name} ${profile.last_name}`.trim() || profile.username,
      imageUrl: profile.avatar
    }
  };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      authType: z.enum(['oauth', 'simple_token']).optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth2',
    key: 'oauth',
    scopes: [
      {
        title: 'Activity Read',
        description: 'Read activity data (steps, active time, etc.)',
        scope: 'activity_read'
      },
      { title: 'Activity Write', description: 'Write activity data', scope: 'activity_write' },
      {
        title: 'Productivity Read',
        description: 'Read productivity data',
        scope: 'productivity_read'
      },
      {
        title: 'Productivity Write',
        description: 'Write productivity data',
        scope: 'productivity_write'
      },
      { title: 'Mood Read', description: 'Read mood data', scope: 'mood_read' },
      { title: 'Mood Write', description: 'Write mood data', scope: 'mood_write' },
      { title: 'Sleep Read', description: 'Read sleep data', scope: 'sleep_read' },
      { title: 'Sleep Write', description: 'Write sleep data', scope: 'sleep_write' },
      { title: 'Workouts Read', description: 'Read workout data', scope: 'workouts_read' },
      { title: 'Workouts Write', description: 'Write workout data', scope: 'workouts_write' },
      { title: 'Events Read', description: 'Read events data', scope: 'events_read' },
      { title: 'Events Write', description: 'Write events data', scope: 'events_write' },
      { title: 'Finance Read', description: 'Read finance data', scope: 'finance_read' },
      { title: 'Finance Write', description: 'Write finance data', scope: 'finance_write' },
      { title: 'Food Read', description: 'Read food and drink data', scope: 'food_read' },
      { title: 'Food Write', description: 'Write food and drink data', scope: 'food_write' },
      { title: 'Health Read', description: 'Read health and body data', scope: 'health_read' },
      {
        title: 'Health Write',
        description: 'Write health and body data',
        scope: 'health_write'
      },
      { title: 'Location Read', description: 'Read location data', scope: 'location_read' },
      { title: 'Location Write', description: 'Write location data', scope: 'location_write' },
      { title: 'Media Read', description: 'Read media data', scope: 'media_read' },
      { title: 'Media Write', description: 'Write media data', scope: 'media_write' },
      { title: 'Social Read', description: 'Read social data', scope: 'social_read' },
      { title: 'Social Write', description: 'Write social data', scope: 'social_write' },
      { title: 'Weather Read', description: 'Read weather data', scope: 'weather_read' },
      { title: 'Weather Write', description: 'Write weather data', scope: 'weather_write' },
      { title: 'Symptoms Read', description: 'Read symptoms data', scope: 'symptoms_read' },
      { title: 'Symptoms Write', description: 'Write symptoms data', scope: 'symptoms_write' },
      {
        title: 'Medication Read',
        description: 'Read medication data',
        scope: 'medication_read'
      },
      {
        title: 'Medication Write',
        description: 'Write medication data',
        scope: 'medication_write'
      },
      { title: 'Custom Read', description: 'Read custom tags data', scope: 'custom_read' },
      { title: 'Custom Write', description: 'Write custom tags data', scope: 'custom_write' },
      { title: 'Manual Read', description: 'Read manual tracking data', scope: 'manual_read' },
      {
        title: 'Manual Write',
        description: 'Write manual tracking data',
        scope: 'manual_write'
      }
    ],
    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });
      return {
        url: `https://exist.io/oauth2/authorize?${params.toString()}`
      };
    },
    handleCallback: async ctx => {
      let response = await http.post(
        '/oauth2/access_token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri
        }).toString()
      );

      return {
        output: {
          ...normalizeOAuthTokenResponse(response.data, {
            providerLabel: 'Exist',
            required: true
          }),
          authType: 'oauth' as const
        }
      };
    },
    handleTokenRefresh: async (ctx: {
      output: { token: string; refreshToken?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken)
        throw createApiServiceError(
          'The Exist refresh token is missing. Reconnect using OAuth2.'
        );
      let response = await http.post(
        '/oauth2/access_token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString()
      );

      return {
        output: {
          ...normalizeOAuthTokenResponse(response.data, {
            providerLabel: 'Exist',
            required: true,
            previousRefreshToken: ctx.output.refreshToken
          }),
          authType: 'oauth' as const
        }
      };
    },
    getProfile: async (ctx: { output: { token: string } }) =>
      getConnectionProfile({ ...ctx.output, authType: 'oauth' })
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Username & Password',
    key: 'simple_token',
    inputSchema: z.object({
      username: z.string().describe('Your Exist username'),
      password: z.string().describe('Your Exist password')
    }),
    getOutput: async ctx => {
      requireText(ctx.input.username, 'Exist username');
      requireText(ctx.input.password, 'Exist password');
      let response = await http.post(
        '/api/2/auth/simple-token/',
        new URLSearchParams({
          username: ctx.input.username,
          password: ctx.input.password
        }).toString()
      );
      if (typeof response.data?.token !== 'string' || !response.data.token.trim())
        throw createApiServiceError(
          'Exist did not return an access token. Check your username and password.'
        );

      return {
        output: {
          token: response.data.token,
          authType: 'simple_token' as const
        }
      };
    },
    getProfile: async (ctx: { output: { token: string } }) =>
      getConnectionProfile({ ...ctx.output, authType: 'simple_token' })
  });
