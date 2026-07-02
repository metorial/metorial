import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { youtubeOAuthError, youtubeServiceError } from './lib/errors';
import { youtubeScopes } from './scopes';

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
      apiKey: z.string().optional(),
      authType: z.enum(['oauth', 'apiKey']).optional(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth2',
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
        title: 'Manage Account',
        description: 'Manage your YouTube account',
        scope: youtubeScopes.youtube
      },
      {
        title: 'Read Only',
        description: 'View your YouTube account',
        scope: youtubeScopes.youtubeReadonly
      },
      {
        title: 'Force SSL',
        description:
          'See, edit, and permanently delete your YouTube videos, ratings, comments, and captions',
        scope: youtubeScopes.youtubeForceSsl
      },
      {
        title: 'Upload Videos',
        description: 'Manage your YouTube videos',
        scope: youtubeScopes.youtubeUpload
      },
      {
        title: 'Memberships',
        description:
          'See a list of your current active channel members, their current level, and when they became a member',
        scope: youtubeScopes.youtubeChannelMembershipsCreator
      },
      {
        title: 'Partner',
        description: 'View and manage your assets and associated content on YouTube',
        scope: youtubeScopes.youtubepartner
      },
      {
        title: 'Partner Audit',
        description:
          'View private information of your YouTube channel relevant during the audit process with a YouTube partner',
        scope: youtubeScopes.youtubepartnerChannelAudit
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
      let response: any;
      try {
        response = await googleAxios.post(
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
      } catch (error) {
        throw youtubeOAuthError('callback', error);
      }

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;
      let grantedScopes =
        typeof data.scope === 'string' ? data.scope.split(' ').filter(Boolean) : undefined;

      return {
        output: {
          token: data.access_token,
          authType: 'oauth' as const,
          refreshToken: data.refresh_token,
          expiresAt
        },
        scopes: grantedScopes
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw youtubeServiceError('No refresh token available');
      }

      let response: any;
      try {
        response = await googleAxios.post(
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
      } catch (error) {
        throw youtubeOAuthError('refresh', error);
      }

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          authType: 'oauth' as const,
          refreshToken: ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: any;
      scopes: string[];
    }) => {
      let response: any;
      try {
        response = await userInfoAxios.get('/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`
          }
        });
      } catch (error) {
        throw youtubeOAuthError('profile lookup', error);
      }

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
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z.string().describe('YouTube Data API v3 key from Google Cloud Console')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          apiKey: ctx.input.apiKey,
          authType: 'apiKey'
        }
      };
    }
  });
