import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { frontApiError, frontServiceError } from './lib/errors';

let oauthAxios = createAxios({
  baseURL: 'https://app.frontapp.com'
});

let apiAxios = createAxios({
  baseURL: 'https://api2.frontapp.com'
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
        url: 'https://dev.frontapp.com/docs/oauth'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://dev.frontapp.com/docs/authentication'
      }
    ],

    scopes: [
      {
        title: 'Read conversations',
        description: 'Read Front conversations and conversation metadata',
        scope: 'conversations:read'
      },
      {
        title: 'Write conversations',
        description:
          'Update conversation status, assignment, tags, followers, links, and reminders',
        scope: 'conversations:write'
      },
      {
        title: 'Read messages',
        description: 'Read messages in conversations',
        scope: 'messages:read'
      },
      {
        title: 'Send messages',
        description: 'Send new messages and replies from Front channels',
        scope: 'messages:send'
      },
      {
        title: 'Read contacts',
        description: 'Read Front contacts',
        scope: 'contacts:read'
      },
      {
        title: 'Write contacts',
        description: 'Create, update, merge, and manage Front contact handles',
        scope: 'contacts:write'
      },
      {
        title: 'Delete contacts',
        description: 'Delete Front contacts',
        scope: 'contacts:delete'
      },
      {
        title: 'Read accounts',
        description: 'Read Front accounts',
        scope: 'accounts:read'
      },
      {
        title: 'Write accounts',
        description: 'Create and update Front accounts',
        scope: 'accounts:write'
      },
      {
        title: 'Delete accounts',
        description: 'Delete Front accounts',
        scope: 'accounts:delete'
      },
      {
        title: 'Read inboxes and channels',
        description: 'Read Front inboxes and channels',
        scope: 'inboxes:read'
      },
      {
        title: 'Read channels',
        description: 'Read Front channel metadata used for sending messages',
        scope: 'channels:read'
      },
      {
        title: 'Read tags',
        description: 'Read Front tags',
        scope: 'tags:read'
      },
      {
        title: 'Write tags',
        description: 'Create and update Front tags',
        scope: 'tags:write'
      },
      {
        title: 'Delete tags',
        description: 'Delete Front tags',
        scope: 'tags:delete'
      },
      {
        title: 'Write comments',
        description: 'Add internal comments to Front conversations',
        scope: 'comments:write'
      },
      {
        title: 'Read teammates',
        description: 'Read Front teammate metadata',
        scope: 'teammates:read'
      },
      {
        title: 'Write teammates',
        description: 'Update Front teammate metadata and availability',
        scope: 'teammates:write'
      },
      {
        title: 'Read teams',
        description: 'Read Front teams',
        scope: 'teams:read'
      },
      {
        title: 'Write teams',
        description: 'Manage Front team membership',
        scope: 'teams:write'
      },
      {
        title: 'Read links',
        description: 'Read Front links that connect conversations to external resources',
        scope: 'links:read'
      },
      {
        title: 'Write links',
        description: 'Create and update Front links',
        scope: 'links:write'
      },
      {
        title: 'Read message templates',
        description: 'Read reusable Front message templates',
        scope: 'message_templates:read'
      },
      {
        title: 'Write message templates',
        description: 'Create and update reusable Front message templates',
        scope: 'message_templates:write'
      },
      {
        title: 'Delete message templates',
        description: 'Delete reusable Front message templates',
        scope: 'message_templates:delete'
      },
      {
        title: 'Read analytics',
        description: 'Create and inspect Front analytics reports and exports',
        scope: 'analytics:read'
      },
      {
        title: 'Read knowledge bases',
        description: 'Read Front knowledge bases, categories, and articles',
        scope: 'knowledge_bases:read'
      },
      {
        title: 'Read events',
        description: 'Read Front events and conversation activity',
        scope: 'events:*:read'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      return {
        url: `https://app.frontapp.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      try {
        let response = await oauthAxios.post(
          '/oauth/token',
          {
            code: ctx.code,
            redirect_uri: ctx.redirectUri,
            grant_type: 'authorization_code'
          },
          {
            headers: {
              Authorization: `Basic ${credentials}`,
              'Content-Type': 'application/json'
            }
          }
        );

        let data = response.data;

        if (!data.access_token) {
          throw frontServiceError(
            'Front OAuth token response did not include an access token.'
          );
        }

        return {
          output: {
            token: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: data.expires_at ? String(data.expires_at) : undefined
          }
        };
      } catch (error) {
        throw frontApiError(error, 'OAuth token exchange');
      }
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw frontServiceError(
          'Front OAuth refresh token is missing. Reconnect the account.'
        );
      }

      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      try {
        let response = await oauthAxios.post(
          '/oauth/token',
          {
            refresh_token: ctx.output.refreshToken,
            grant_type: 'refresh_token'
          },
          {
            headers: {
              Authorization: `Basic ${credentials}`,
              'Content-Type': 'application/json'
            }
          }
        );

        let data = response.data;

        if (!data.access_token) {
          throw frontServiceError(
            'Front OAuth refresh response did not include an access token.'
          );
        }

        return {
          output: {
            token: data.access_token,
            refreshToken: data.refresh_token || ctx.output.refreshToken,
            expiresAt: data.expires_at ? String(data.expires_at) : undefined
          }
        };
      } catch (error) {
        throw frontApiError(error, 'OAuth token refresh');
      }
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: {};
      scopes: string[];
    }) => {
      try {
        let response = await apiAxios.get('/me', {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`
          }
        });

        let data = response.data;

        return {
          profile: {
            id: data.id,
            name: data.name
          }
        };
      } catch (error) {
        throw frontApiError(error, 'profile lookup');
      }
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      apiToken: z
        .string()
        .describe('Front API token created in Settings > Developers > API Tokens')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: { apiToken: string };
    }) => {
      try {
        let response = await apiAxios.get('/me', {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`
          }
        });

        let data = response.data;

        return {
          profile: {
            id: data.id,
            name: data.name
          }
        };
      } catch (error) {
        throw frontApiError(error, 'profile lookup');
      }
    }
  });
