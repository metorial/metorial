import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { zoomApiError, zoomOAuthError, zoomServiceError } from './lib/errors';

let authAxios = createAxios({
  baseURL: 'https://zoom.us'
});

let apiAxios = createAxios({
  baseURL: 'https://api.zoom.us/v2'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      accountId: z.string().optional()
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
        url: 'https://developers.zoom.us/docs/integrations/oauth/'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.zoom.us/docs/integrations/oauth-scopes-granular/'
      }
    ],

    scopes: [
      // User scopes
      { title: 'Get User', description: 'View a Zoom user profile', scope: 'user:read:user' },
      {
        title: 'Get User (Admin)',
        description: 'View any Zoom user profile as admin',
        scope: 'user:read:user:admin'
      },
      {
        title: 'List Users (Admin)',
        description: 'List users in the Zoom account',
        scope: 'user:read:list_users:admin'
      },
      {
        title: 'Get User Settings',
        description: 'View Zoom user settings',
        scope: 'user:read:settings'
      },
      {
        title: 'Get User Settings (Admin)',
        description: 'View Zoom user settings as admin',
        scope: 'user:read:settings:admin'
      },

      // Meeting scopes
      {
        title: 'List Meetings',
        description: 'List meetings for a Zoom user',
        scope: 'meeting:read:list_meetings'
      },
      {
        title: 'List Meetings (Admin)',
        description: 'List meetings for account users as admin',
        scope: 'meeting:read:list_meetings:admin'
      },
      {
        title: 'Create Meeting',
        description: 'Create Zoom meetings',
        scope: 'meeting:write:meeting'
      },
      {
        title: 'Create Meeting (Admin)',
        description: 'Create Zoom meetings for account users as admin',
        scope: 'meeting:write:meeting:admin'
      },
      {
        title: 'Get Meeting',
        description: 'Read Zoom meeting details',
        scope: 'meeting:read:meeting'
      },
      {
        title: 'Get Meeting (Admin)',
        description: 'Read Zoom meeting details as admin',
        scope: 'meeting:read:meeting:admin'
      },
      {
        title: 'Update Meeting',
        description: 'Update Zoom meetings',
        scope: 'meeting:update:meeting'
      },
      {
        title: 'Update Meeting (Admin)',
        description: 'Update Zoom meetings as admin',
        scope: 'meeting:update:meeting:admin'
      },
      {
        title: 'Delete Meeting',
        description: 'Delete Zoom meetings',
        scope: 'meeting:delete:meeting'
      },
      {
        title: 'Delete Meeting (Admin)',
        description: 'Delete Zoom meetings as admin',
        scope: 'meeting:delete:meeting:admin'
      },
      {
        title: 'Get Meeting Invitation',
        description: 'Read Zoom meeting invitation text',
        scope: 'meeting:read:invitation'
      },
      {
        title: 'Get Meeting Invitation (Admin)',
        description: 'Read Zoom meeting invitation text as admin',
        scope: 'meeting:read:invitation:admin'
      },
      {
        title: 'List Meeting Registrants',
        description: 'List registrants for Zoom meetings',
        scope: 'meeting:read:list_registrants'
      },
      {
        title: 'List Meeting Registrants (Admin)',
        description: 'List registrants for Zoom meetings as admin',
        scope: 'meeting:read:list_registrants:admin'
      },
      {
        title: 'Add Meeting Registrant',
        description: 'Add registrants to Zoom meetings',
        scope: 'meeting:write:registrant'
      },
      {
        title: 'Add Meeting Registrant (Admin)',
        description: 'Add registrants to Zoom meetings as admin',
        scope: 'meeting:write:registrant:admin'
      },
      {
        title: 'List Meeting Polls',
        description: 'List Zoom meeting polls',
        scope: 'meeting:read:list_polls'
      },
      {
        title: 'List Meeting Polls (Admin)',
        description: 'List Zoom meeting polls as admin',
        scope: 'meeting:read:list_polls:admin'
      },
      {
        title: 'Get Meeting Poll',
        description: 'Read a Zoom meeting poll',
        scope: 'meeting:read:poll'
      },
      {
        title: 'Get Meeting Poll (Admin)',
        description: 'Read a Zoom meeting poll as admin',
        scope: 'meeting:read:poll:admin'
      },
      {
        title: 'Create Meeting Poll',
        description: 'Create Zoom meeting polls',
        scope: 'meeting:write:poll'
      },
      {
        title: 'Create Meeting Poll (Admin)',
        description: 'Create Zoom meeting polls as admin',
        scope: 'meeting:write:poll:admin'
      },
      {
        title: 'Update Meeting Poll',
        description: 'Update Zoom meeting polls',
        scope: 'meeting:update:poll'
      },
      {
        title: 'Update Meeting Poll (Admin)',
        description: 'Update Zoom meeting polls as admin',
        scope: 'meeting:update:poll:admin'
      },
      {
        title: 'Delete Meeting Poll',
        description: 'Delete Zoom meeting polls',
        scope: 'meeting:delete:poll'
      },
      {
        title: 'Delete Meeting Poll (Admin)',
        description: 'Delete Zoom meeting polls as admin',
        scope: 'meeting:delete:poll:admin'
      },

      // Webinar scopes
      {
        title: 'List Webinars',
        description: 'List Zoom webinars',
        scope: 'webinar:read:list_webinars'
      },
      {
        title: 'List Webinars (Admin)',
        description: 'List Zoom webinars as admin',
        scope: 'webinar:read:list_webinars:admin'
      },
      {
        title: 'Create Webinar',
        description: 'Create Zoom webinars',
        scope: 'webinar:write:webinar'
      },
      {
        title: 'Create Webinar (Admin)',
        description: 'Create Zoom webinars as admin',
        scope: 'webinar:write:webinar:admin'
      },
      {
        title: 'Get Webinar',
        description: 'Read Zoom webinar details',
        scope: 'webinar:read:webinar'
      },
      {
        title: 'Get Webinar (Admin)',
        description: 'Read Zoom webinar details as admin',
        scope: 'webinar:read:webinar:admin'
      },
      {
        title: 'Update Webinar',
        description: 'Update Zoom webinars',
        scope: 'webinar:update:webinar'
      },
      {
        title: 'Update Webinar (Admin)',
        description: 'Update Zoom webinars as admin',
        scope: 'webinar:update:webinar:admin'
      },
      {
        title: 'Delete Webinar',
        description: 'Delete Zoom webinars',
        scope: 'webinar:delete:webinar'
      },
      {
        title: 'Delete Webinar (Admin)',
        description: 'Delete Zoom webinars as admin',
        scope: 'webinar:delete:webinar:admin'
      },

      // Recording scopes
      {
        title: 'List User Recordings',
        description: 'List cloud recordings for a Zoom user',
        scope: 'cloud_recording:read:list_user_recordings'
      },
      {
        title: 'List User Recordings (Admin)',
        description: 'List cloud recordings for account users as admin',
        scope: 'cloud_recording:read:list_user_recordings:admin'
      },
      {
        title: 'Get Meeting Recordings',
        description: 'List recording files for a Zoom meeting',
        scope: 'cloud_recording:read:list_recording_files'
      },
      {
        title: 'Get Meeting Recordings (Admin)',
        description: 'List recording files for a Zoom meeting as admin',
        scope: 'cloud_recording:read:list_recording_files:admin'
      },
      {
        title: 'Delete Meeting Recording',
        description: 'Delete all recordings for a Zoom meeting',
        scope: 'cloud_recording:delete:meeting_recording'
      },
      {
        title: 'Delete Meeting Recording (Admin)',
        description: 'Delete all recordings for a Zoom meeting as admin',
        scope: 'cloud_recording:delete:meeting_recording:admin'
      },
      {
        title: 'Delete Recording File',
        description: 'Delete a Zoom recording file',
        scope: 'cloud_recording:delete:recording_file'
      },
      {
        title: 'Delete Recording File (Admin)',
        description: 'Delete a Zoom recording file as admin',
        scope: 'cloud_recording:delete:recording_file:admin'
      },

      // Team Chat scopes
      {
        title: 'List Chat Channels',
        description: 'List Zoom Team Chat channels for a user',
        scope: 'team_chat:read:list_user_channels'
      },
      {
        title: 'List Chat Channels (Admin)',
        description: 'List Zoom Team Chat channels for account users as admin',
        scope: 'team_chat:read:list_user_channels:admin'
      },
      {
        title: 'List Chat Messages',
        description: 'List Zoom Team Chat messages',
        scope: 'team_chat:read:list_user_messages'
      },
      {
        title: 'List Chat Messages (Admin)',
        description: 'List Zoom Team Chat messages as admin',
        scope: 'team_chat:read:list_user_messages:admin'
      },
      {
        title: 'Get Chat Message',
        description: 'Read a Zoom Team Chat message',
        scope: 'team_chat:read:user_message'
      },
      {
        title: 'Get Chat Message (Admin)',
        description: 'Read a Zoom Team Chat message as admin',
        scope: 'team_chat:read:user_message:admin'
      },
      {
        title: 'Send Chat Message',
        description: 'Send Zoom Team Chat messages',
        scope: 'team_chat:write:user_message'
      },
      {
        title: 'Send Chat Message (Admin)',
        description: 'Send Zoom Team Chat messages as admin',
        scope: 'team_chat:write:user_message:admin'
      },
      {
        title: 'Update Chat Message',
        description: 'Update Zoom Team Chat messages',
        scope: 'team_chat:update:user_message'
      },
      {
        title: 'Update Chat Message (Admin)',
        description: 'Update Zoom Team Chat messages as admin',
        scope: 'team_chat:update:user_message:admin'
      },
      {
        title: 'Delete Chat Message',
        description: 'Delete Zoom Team Chat messages',
        scope: 'team_chat:delete:user_message'
      },
      {
        title: 'Delete Chat Message (Admin)',
        description: 'Delete Zoom Team Chat messages as admin',
        scope: 'team_chat:delete:user_message:admin'
      },

      // Report scopes
      {
        title: 'Get Meeting Report',
        description: 'Read Zoom meeting reports',
        scope: 'report:read:meeting:admin'
      },
      {
        title: 'Get Meeting Participant Report',
        description: 'Read Zoom meeting participant reports',
        scope: 'report:read:list_meeting_participants:admin'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(' '));
      }

      return {
        url: `https://zoom.us/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response: any;
      try {
        response = await authAxios.post(
          '/oauth/token',
          new URLSearchParams({
            grant_type: 'authorization_code',
            code: ctx.code,
            redirect_uri: ctx.redirectUri
          }).toString(),
          {
            headers: {
              Authorization: `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
      } catch (error) {
        throw zoomOAuthError(error, 'authorization code exchange');
      }

      let data = response.data;
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
        throw zoomServiceError('Zoom OAuth refresh token is required to refresh access.');
      }

      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response: any;
      try {
        response = await authAxios.post(
          '/oauth/token',
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: ctx.output.refreshToken
          }).toString(),
          {
            headers: {
              Authorization: `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
      } catch (error) {
        throw zoomOAuthError(error, 'token refresh');
      }

      let data = response.data;
      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string; accountId?: string };
      input: Record<string, never>;
      scopes: string[];
    }) => {
      let response: any;
      try {
        response = await apiAxios.get('/users/me', {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`
          }
        });
      } catch (error) {
        throw zoomApiError(error, 'get OAuth profile');
      }

      let user = response.data;

      return {
        profile: {
          id: user.id,
          email: user.email,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          imageUrl: user.pic_url,
          accountId: user.account_id,
          type: user.type
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Server-to-Server OAuth',
    key: 'server_to_server_oauth',

    inputSchema: z.object({
      accountId: z.string().describe('Zoom Account ID'),
      clientId: z.string().describe('Client ID from Zoom App Marketplace'),
      clientSecret: z.string().describe('Client Secret from Zoom App Marketplace')
    }),

    getOutput: async (ctx: {
      input: { accountId: string; clientId: string; clientSecret: string };
    }) => {
      let credentials = btoa(`${ctx.input.clientId}:${ctx.input.clientSecret}`);

      let response: any;
      try {
        response = await authAxios.post(
          '/oauth/token',
          new URLSearchParams({
            grant_type: 'account_credentials',
            account_id: ctx.input.accountId
          }).toString(),
          {
            headers: {
              Authorization: `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
      } catch (error) {
        throw zoomOAuthError(error, 'server-to-server token exchange');
      }

      let data = response.data;
      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          expiresAt,
          accountId: ctx.input.accountId
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string; accountId?: string };
      input: { accountId: string; clientId: string; clientSecret: string };
    }) => {
      let response: any;
      try {
        response = await apiAxios.get('/users/me', {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`
          }
        });
      } catch (error) {
        throw zoomApiError(error, 'get server-to-server profile');
      }

      let user = response.data;

      return {
        profile: {
          id: user.id,
          email: user.email,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          imageUrl: user.pic_url,
          accountId: user.account_id
        }
      };
    }
  });
