import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let api = createAxios({
  baseURL: 'https://webexapis.com/v1'
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
        url: 'https://developer.webex.com/docs/integrations'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developer.webex.com/docs/integrations#scopes'
      }
    ],

    scopes: [
      {
        title: 'Messages Read',
        description: 'Read messages in spaces',
        scope: 'spark:messages_read'
      },
      {
        title: 'Messages Write',
        description: 'Create, edit, and delete messages in spaces',
        scope: 'spark:messages_write'
      },
      {
        title: 'Rooms Read',
        description: 'Read space/room details and list spaces',
        scope: 'spark:rooms_read'
      },
      {
        title: 'Rooms Write',
        description: 'Create, update, and delete spaces/rooms',
        scope: 'spark:rooms_write'
      },
      {
        title: 'Memberships Read',
        description: 'List and get membership details in spaces',
        scope: 'spark:memberships_read'
      },
      {
        title: 'Memberships Write',
        description: 'Add and remove people from spaces',
        scope: 'spark:memberships_write'
      },
      {
        title: 'People Read',
        description: 'Read user profiles and directory information',
        scope: 'spark:people_read'
      },
      {
        title: 'People Write',
        description: 'Create and update user accounts (admin)',
        scope: 'spark:people_write'
      },
      {
        title: 'Meeting Schedules Read',
        description: 'Read meeting schedules and details',
        scope: 'meeting:schedules_read'
      },
      {
        title: 'Meeting Schedules Write',
        description: 'Create, update, and delete meetings',
        scope: 'meeting:schedules_write'
      },
      {
        title: 'Meeting Recordings Read',
        description: 'Read meeting recordings',
        scope: 'meeting:recordings_read'
      },
      {
        title: 'Meeting Recordings Write',
        description: 'Manage meeting recordings',
        scope: 'meeting:recordings_write'
      },
      {
        title: 'Meeting Transcripts Read',
        description: 'Read meeting transcripts',
        scope: 'meeting:transcripts_read'
      },
      {
        title: 'Webhooks Read',
        description: 'List and get webhook details',
        scope: 'spark:webhooks_read'
      },
      {
        title: 'Webhooks Write',
        description: 'Create, update, and delete webhooks',
        scope: 'spark:webhooks_write'
      },
      {
        title: 'Teams Read',
        description: 'Read team details',
        scope: 'spark:teams_read'
      },
      {
        title: 'Teams Write',
        description: 'Create, update, and delete teams',
        scope: 'spark:teams_write'
      },
      {
        title: 'Spark All',
        description:
          'Full access to messaging, spaces, memberships, teams, and calling features',
        scope: 'spark:all'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        scope: ctx.scopes.join(' '),
        state: ctx.state
      });

      return {
        url: `https://webexapis.com/v1/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await api.post(
        '/access_token',
        {
          grant_type: 'authorization_code',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
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
      let response = await api.post(
        '/access_token',
        {
          grant_type: 'refresh_token',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.output.refreshToken
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
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

    getProfile: async (ctx: any) => {
      let response = await api.get('/people/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let person = response.data;

      return {
        profile: {
          id: person.id,
          email: person.emails?.[0],
          name: person.displayName,
          imageUrl: person.avatar
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Bot Token',
    key: 'bot_token',

    inputSchema: z.object({
      token: z.string().describe('Bot access token from developer.webex.com')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await api.get('/people/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let person = response.data;

      return {
        profile: {
          id: person.id,
          email: person.emails?.[0],
          name: person.displayName,
          imageUrl: person.avatar
        }
      };
    }
  });
