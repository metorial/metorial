import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { googleMeetOAuthError, googleMeetServiceError } from './lib/errors';
import { googleMeetScopes } from './scopes';

let googleAxios = createAxios({
  baseURL: 'https://oauth2.googleapis.com'
});

let userInfoAxios = createAxios({
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
    name: 'Google OAuth',
    key: 'google_oauth',
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
        title: 'Spaces (Created)',
        description:
          'Create, modify, and read metadata about meeting spaces created by your app.',
        scope: googleMeetScopes.spaceCreated
      },
      {
        title: 'Spaces (Read)',
        description: 'Read metadata about any meeting space the user has access to.',
        scope: googleMeetScopes.spaceReadonly
      },
      {
        title: 'Space Settings',
        description: 'Edit and see the settings for all Google Meet calls.',
        scope: googleMeetScopes.spaceSettings
      },
      {
        title: 'Drive (Read)',
        description: 'Download recording and transcript files from Google Drive.',
        scope: googleMeetScopes.driveReadonly
      },
      {
        title: 'Drive Meet (Read)',
        description: 'View Drive files created or edited by Google Meet.',
        scope: googleMeetScopes.driveMeetReadonly
      },
      {
        title: 'User Profile',
        description: 'View basic profile information.',
        scope: googleMeetScopes.userInfoProfile
      },
      {
        title: 'User Email',
        description: 'View email address.',
        scope: googleMeetScopes.userInfoEmail
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
      try {
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
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
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
      } catch (error) {
        throw googleMeetOAuthError('authorization callback', error);
      }
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw googleMeetServiceError(
          'No refresh token available for Google Meet OAuth refresh.'
        );
      }

      try {
        let response = await googleAxios.post(
          '/token',
          new URLSearchParams({
            refresh_token: ctx.output.refreshToken,
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            grant_type: 'refresh_token'
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
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
      } catch (error) {
        throw googleMeetOAuthError('token refresh', error);
      }
    },

    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      try {
        let response = await userInfoAxios.get('/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`
          }
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
      } catch (error) {
        throw googleMeetOAuthError('profile lookup', error);
      }
    }
  });
