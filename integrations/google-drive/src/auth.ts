import { createApiServiceError, createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { googleDriveScopes } from './scopes';

let oauthAxios = createAxios({
  baseURL: 'https://oauth2.googleapis.com'
});

let userinfoAxios = createAxios({
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
        description: 'Full read and write access to all Google Drive files',
        scope: googleDriveScopes.drive
      },
      {
        title: 'Read Only',
        description: 'Read-only access to all Google Drive files',
        scope: googleDriveScopes.driveReadonly
      },
      {
        title: 'File Access',
        description: 'Access only to files created or opened by the app',
        scope: googleDriveScopes.driveFile
      },
      {
        title: 'App Data',
        description: 'Access to app-specific data folder',
        scope: googleDriveScopes.driveAppdata
      },
      {
        title: 'Metadata',
        description: 'Read and write access to file metadata only',
        scope: googleDriveScopes.driveMetadata
      },
      {
        title: 'Metadata Read Only',
        description: 'Read-only access to file metadata',
        scope: googleDriveScopes.driveMetadataReadonly
      },
      {
        title: 'Photos Read Only',
        description: 'Read-only access to photos and videos in Google Photos',
        scope: googleDriveScopes.drivePhotosReadonly
      },
      {
        title: 'User Profile',
        description: 'View your basic profile info (name, email, photo)',
        scope: googleDriveScopes.userInfoProfile
      },
      {
        title: 'User Email',
        description: 'View your email address',
        scope: googleDriveScopes.userInfoEmail
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        scope: ctx.scopes.join(' '),
        access_type: 'offline',
        prompt: 'consent'
      });

      return {
        url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await oauthAxios.post(
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
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'No Google refresh token is available. Reconnect Google Drive to restore offline access.',
          { reason: 'google_drive_missing_refresh_token' }
        );
      }

      let response = await oauthAxios.post(
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
    },

    getProfile: async (ctx: any) => {
      let response = await userinfoAxios.get('/oauth2/v2/userinfo', {
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
    }
  });
