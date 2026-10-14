import { createApiServiceError, normalizeOAuthTokenResponse, SlateAuth } from 'slates';
import { z } from 'zod';
import { createChatworkAxios } from './lib/client';

let apiAxios = createChatworkAxios('https://api.chatwork.com/v2');

let oauthAxios = createChatworkAxios('https://oauth.chatwork.com');

let authOutputSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  authType: z.enum(['oauth', 'api_token']).optional()
});

type ChatworkAuthOutput = z.infer<typeof authOutputSchema>;

export let auth = SlateAuth.create()
  .output(authOutputSchema)
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Read User Profile',
        description: 'Read your own profile information',
        scope: 'users.profile.me:read'
      },
      {
        title: 'Read User Status',
        description: 'Read your unread/mention/task counts',
        scope: 'users.status.me:read'
      },
      {
        title: 'Read User Tasks',
        description: 'Read your assigned task list',
        scope: 'users.tasks.me:read'
      },
      {
        title: 'Create/Delete Rooms',
        description: 'Create and delete chat rooms',
        scope: 'rooms:write'
      },
      {
        title: 'Room Info (Read)',
        description: 'List and get room details',
        scope: 'rooms.info:read'
      },
      {
        title: 'Room Info (Write)',
        description: 'Update room information',
        scope: 'rooms.info:write'
      },
      {
        title: 'Room Members (Read)',
        description: 'Get room member lists',
        scope: 'rooms.members:read'
      },
      {
        title: 'Room Members (Write)',
        description: 'Add, remove, or change room member roles',
        scope: 'rooms.members:write'
      },
      {
        title: 'Messages (Read)',
        description: 'Read messages in chat rooms',
        scope: 'rooms.messages:read'
      },
      {
        title: 'Messages (Write)',
        description: 'Post, edit, and delete messages; mark as read/unread',
        scope: 'rooms.messages:write'
      },
      {
        title: 'Tasks (Read)',
        description: 'Read tasks in chat rooms',
        scope: 'rooms.tasks:read'
      },
      {
        title: 'Tasks (Write)',
        description: 'Create tasks in chat rooms',
        scope: 'rooms.tasks:write'
      },
      {
        title: 'Files (Read)',
        description: 'Read file information in chat rooms',
        scope: 'rooms.files:read'
      },
      {
        title: 'Contacts (Read & Write)',
        description: 'Read and manage contacts and contact requests',
        scope: 'contacts.all:read_write'
      },
      {
        title: 'Offline Access',
        description: 'Enables indefinite refresh token lifetime',
        scope: 'offline_access'
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
        url: `https://www.chatwork.com/packages/oauth2/login.php?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let credentials = Buffer.from(`${ctx.clientId}:${ctx.clientSecret}`).toString('base64');

      let response = await oauthAxios.post(
        '/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`
          }
        }
      );

      let tokens = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Chatwork',
        operation: 'token exchange'
      });
      if (!tokens.refreshToken) {
        throw createApiServiceError(
          'Chatwork did not return a refresh token. Reconnect your account.'
        );
      }

      return {
        output: {
          ...tokens,
          expiresAt: tokens.expiresAt ?? new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          authType: 'oauth' as const
        }
      };
    },

    handleTokenRefresh: async (ctx: {
      output: ChatworkAuthOutput;
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'No Chatwork refresh token is available. Reconnect your account.'
        );
      }

      let credentials = Buffer.from(`${ctx.clientId}:${ctx.clientSecret}`).toString('base64');

      let response = await oauthAxios.post(
        '/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`
          }
        }
      );

      let tokens = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Chatwork',
        operation: 'token refresh',
        previousRefreshToken: ctx.output.refreshToken,
        refreshTokenFallbackMode: 'falsy'
      });

      return {
        output: {
          ...tokens,
          expiresAt: tokens.expiresAt ?? new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          authType: 'oauth' as const
        }
      };
    },

    getProfile: async (ctx: { output: ChatworkAuthOutput }) => {
      let response = await apiAxios.get('/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let me = response.data;

      return {
        profile: {
          id: String(me.account_id),
          name: me.name,
          email: me.mail || me.login_mail,
          imageUrl: me.avatar_image_url,
          organization: me.organization_name,
          department: me.department
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z.string().describe('Chatwork API token from account settings')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          authType: 'api_token' as const
        }
      };
    },

    getProfile: async (ctx: { output: ChatworkAuthOutput }) => {
      let response = await apiAxios.get('/me', {
        headers: {
          'X-ChatWorkToken': ctx.output.token
        }
      });

      let me = response.data;

      return {
        profile: {
          id: String(me.account_id),
          name: me.name,
          email: me.mail || me.login_mail,
          imageUrl: me.avatar_image_url,
          organization: me.organization_name,
          department: me.department
        }
      };
    }
  });
