import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let apiAxios = createAxios({
  baseURL: 'https://api.chatwork.com/v2'
});

let oauthAxios = createAxios({
  baseURL: 'https://oauth.chatwork.com'
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
        title: 'All User Data (Read)',
        description: 'Read all user data including profile, status, and tasks',
        scope: 'users.all:read'
      },
      {
        title: 'Rooms (Read & Write)',
        description: 'Full read and write access to chat rooms',
        scope: 'rooms.all:read_write'
      },
      {
        title: 'Rooms (Read)',
        description: 'Read room info, members, messages, tasks, and files',
        scope: 'rooms.all:read'
      },
      {
        title: 'Rooms (Write)',
        description: 'Write room info, members, messages, tasks, and files',
        scope: 'rooms.all:write'
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
        title: 'Files (Write)',
        description: 'Upload files to chat rooms',
        scope: 'rooms.files:write'
      },
      {
        title: 'Contacts (Read & Write)',
        description: 'Read and manage contacts and contact requests',
        scope: 'contacts.all:read_write'
      },
      {
        title: 'Contacts (Read)',
        description: 'Read contacts and incoming contact requests',
        scope: 'contacts.all:read'
      },
      {
        title: 'Contacts (Write)',
        description: 'Approve or reject incoming contact requests',
        scope: 'contacts.all:write'
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
        throw new Error('No refresh token available');
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

      let data = response.data;
      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
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
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
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
