import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { googleCalendarScopes } from './scopes';

let googleAxios = createAxios({
  baseURL: 'https://oauth2.googleapis.com'
});

let profileAxios = createAxios({
  baseURL: 'https://www.googleapis.com'
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
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://support.google.com/cloud/answer/15544987'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.google.com/identity/protocols/oauth2/scopes'
      }
    ],

    scopes: [
      {
        title: 'Full Access',
        description: 'See, edit, share, and permanently delete all accessible calendars.',
        scope: googleCalendarScopes.calendar
      },
      {
        title: 'Read Only',
        description: 'Read-only access to all accessible calendars.',
        scope: googleCalendarScopes.calendarReadonly
      },
      {
        title: 'Events',
        description: 'View and edit events on all calendars.',
        scope: googleCalendarScopes.calendarEvents
      },
      {
        title: 'Events Read Only',
        description: 'View events on all calendars.',
        scope: googleCalendarScopes.calendarEventsReadonly
      },
      {
        title: 'Owned Events',
        description: 'Manage events only on calendars the user owns.',
        scope: googleCalendarScopes.calendarEventsOwned
      },
      {
        title: 'Owned Events Read Only',
        description: 'View events only on calendars the user owns.',
        scope: googleCalendarScopes.calendarEventsOwnedReadonly
      },
      {
        title: 'Free/Busy (Events)',
        description: 'View availability on accessible calendars.',
        scope: googleCalendarScopes.calendarEventsFreebusy
      },
      {
        title: 'Public Events Read Only',
        description: 'View events on public calendars.',
        scope: googleCalendarScopes.calendarEventsPublicReadonly
      },
      {
        title: 'Free/Busy',
        description: 'View free/busy availability only.',
        scope: googleCalendarScopes.calendarFreebusy
      },
      {
        title: 'Settings Read Only',
        description: 'View Calendar settings.',
        scope: googleCalendarScopes.calendarSettingsReadonly
      },
      {
        title: 'Calendars',
        description: 'See/change calendar properties and create secondary calendars.',
        scope: googleCalendarScopes.calendarCalendars
      },
      {
        title: 'Calendars Read Only',
        description: 'View calendar properties (title, description, timezone, etc.).',
        scope: googleCalendarScopes.calendarCalendarsReadonly
      },
      {
        title: 'Calendar List',
        description: 'See, add, and remove subscribed calendars.',
        scope: googleCalendarScopes.calendarCalendarList
      },
      {
        title: 'Calendar List Read Only',
        description: 'View the list of subscribed calendars.',
        scope: googleCalendarScopes.calendarCalendarListReadonly
      },
      {
        title: 'ACLs',
        description: 'View and change sharing permissions on owned calendars.',
        scope: googleCalendarScopes.calendarAcls
      },
      {
        title: 'ACLs Read Only',
        description: 'View sharing permissions on owned calendars.',
        scope: googleCalendarScopes.calendarAclsReadonly
      },
      {
        title: 'App Created',
        description: 'Manage secondary calendars and their events (app-created only).',
        scope: googleCalendarScopes.calendarAppCreated
      },
      {
        title: 'User Profile',
        description: 'View basic profile information.',
        scope: googleCalendarScopes.userInfoProfile
      },
      {
        title: 'User Email',
        description: 'View email address.',
        scope: googleCalendarScopes.userInfoEmail
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state,
        access_type: 'offline',
        prompt: 'consent'
      });

      return {
        url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await googleAxios.post(
        '/token',
        new URLSearchParams({
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri,
          grant_type: 'authorization_code'
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;
      let grantedScopes =
        typeof data.scope === 'string' ? data.scope.split(' ').filter(Boolean) : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        },
        scopes: grantedScopes
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw new Error('No refresh token available');
      }

      let response = await googleAxios.post(
        '/token',
        new URLSearchParams({
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token'
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: {};
      scopes: string[];
    }) => {
      let response = await profileAxios.get('/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${ctx.output.token}` }
      });

      let data = response.data;

      return {
        profile: {
          id: data.id,
          email: data.email,
          name: data.name,
          imageUrl: data.picture
        }
      };
    }
  });
