import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let http = createAxios({
  baseURL: 'https://exist.io'
});

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
        scope: ctx.scopes.join('+')
      });
      return {
        url: `https://exist.io/oauth2/authorize?${params.toString()}`
      };
    },
    handleCallback: async ctx => {
      let response = await http.post('/oauth2/access_token', {
        grant_type: 'authorization_code',
        code: ctx.code,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri
      });

      let expiresAt = new Date(Date.now() + response.data.expires_in * 1000).toISOString();

      return {
        output: {
          token: response.data.access_token,
          refreshToken: response.data.refresh_token,
          expiresAt,
          authType: 'oauth' as const
        }
      };
    },
    handleTokenRefresh: async (ctx: any) => {
      let response = await http.post('/oauth2/access_token', {
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret
      });

      let expiresAt = new Date(Date.now() + response.data.expires_in * 1000).toISOString();

      return {
        output: {
          token: response.data.access_token,
          refreshToken: response.data.refresh_token,
          expiresAt,
          authType: 'oauth' as const
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string };
      input: Record<string, never>;
      scopes: string[];
    }) => {
      let response = await http.get('/api/2/accounts/profile/', {
        headers: { Authorization: `Bearer ${ctx.output.token}` }
      });

      return {
        profile: {
          id: response.data.username,
          name:
            `${response.data.first_name || ''} ${response.data.last_name || ''}`.trim() ||
            response.data.username,
          email: response.data.email,
          imageUrl: response.data.avatar
        }
      };
    }
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
      let response = await http.post('/api/2/auth/simple-token/', {
        username: ctx.input.username,
        password: ctx.input.password
      });

      return {
        output: {
          token: response.data.token,
          authType: 'simple_token' as const
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string };
      input: { username: string; password: string };
    }) => {
      let response = await http.get('/api/2/accounts/profile/', {
        headers: { Authorization: `Token ${ctx.output.token}` }
      });

      return {
        profile: {
          id: response.data.username,
          name:
            `${response.data.first_name || ''} ${response.data.last_name || ''}`.trim() ||
            response.data.username,
          email: response.data.email,
          imageUrl: response.data.avatar
        }
      };
    }
  });
