import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { intercomApiError } from './lib/errors';

let withIntercomErrors = <T extends ReturnType<typeof createAxios>>(
  http: T,
  operation = 'auth request'
) => {
  http.interceptors.response.use(
    response => response,
    error => Promise.reject(intercomApiError(error, operation))
  );

  return http;
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
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
        url: 'https://developers.intercom.com/docs/build-an-integration/learn-more/authentication/setting-up-oauth'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.intercom.com/docs/build-an-integration/learn-more/authentication/oauth-scopes'
      }
    ],

    scopes: [
      {
        title: 'Read Users & Companies',
        description: 'Read and list users and companies',
        scope: 'read_users_and_companies'
      },
      {
        title: 'Write Users & Companies',
        description: 'Create and update users and companies',
        scope: 'write_users_and_companies'
      },
      {
        title: 'Read Conversations',
        description: 'Read conversations',
        scope: 'read_conversations'
      },
      {
        title: 'Write Conversations',
        description: 'Write conversations (reply, assign, close, etc.)',
        scope: 'write_conversations'
      },
      {
        title: 'Read Tags',
        description: 'Read tags',
        scope: 'read_tags'
      },
      {
        title: 'Write Tags',
        description: 'Create, update, and delete tags',
        scope: 'write_tags'
      },
      {
        title: 'Read Events',
        description: 'Read data events',
        scope: 'read_events'
      },
      {
        title: 'Write Events',
        description: 'Submit data events',
        scope: 'write_events'
      },
      {
        title: 'Read Tickets',
        description: 'View tickets',
        scope: 'read_tickets'
      },
      {
        title: 'Write Tickets',
        description: 'Create and update tickets',
        scope: 'write_tickets'
      },
      {
        title: 'Read Custom Object Instances',
        description: 'Read custom object instances',
        scope: 'read_custom_object_instances'
      },
      {
        title: 'Write Custom Object Instances',
        description: 'Create, update, and delete custom object instances',
        scope: 'write_custom_object_instances'
      },
      {
        title: 'Export Content Data',
        description: 'Export engagement data for content',
        scope: 'export_content_data'
      },
      {
        title: 'Read Admins',
        description: 'List and view all admins',
        scope: 'read_admins'
      },
      {
        title: 'Update Admins',
        description: 'Update admin away mode',
        scope: 'update_admins'
      },
      {
        title: 'Read Admin Activity Logs',
        description: 'View admin activity logs',
        scope: 'read_admin_activity_logs'
      },
      {
        title: 'Read Articles',
        description: 'Read help center articles',
        scope: 'read_articles'
      },
      {
        title: 'Write Articles',
        description: 'Create and update help center articles',
        scope: 'write_articles'
      },
      {
        title: 'Read News',
        description: 'Read news items and newsfeeds',
        scope: 'read_news'
      },
      {
        title: 'Write News',
        description: 'Create and update news items and newsfeeds',
        scope: 'write_news'
      },
      {
        title: 'Read AI Content',
        description: 'Read AI content library',
        scope: 'read_ai_content'
      },
      {
        title: 'Write AI Content',
        description: 'Manage AI content library',
        scope: 'write_ai_content'
      },
      {
        title: 'Write Data Attributes',
        description: 'Create and update custom data attributes',
        scope: 'write_data_attributes'
      },
      {
        title: 'Read Counts',
        description: 'Count users and companies with specified criteria',
        scope: 'read_counts'
      },
      {
        title: 'Export Message Data',
        description: 'Export engagement data for messages',
        scope: 'export_message_data'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let scopeStr =
        ctx.scopes.length > 0 ? `&scope=${encodeURIComponent(ctx.scopes.join(' '))}` : '';
      let url = `https://app.intercom.com/oauth?client_id=${encodeURIComponent(ctx.clientId)}&state=${encodeURIComponent(ctx.state)}&redirect_uri=${encodeURIComponent(ctx.redirectUri)}${scopeStr}`;
      return { url };
    },

    handleCallback: async ctx => {
      let http = withIntercomErrors(
        createAxios({
          baseURL: 'https://api.intercom.io'
        }),
        'OAuth token exchange'
      );

      let response = await http.post('/auth/eagle/token', {
        code: ctx.code,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret
      });

      return {
        output: {
          token: response.data.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      let http = withIntercomErrors(
        createAxios({
          baseURL: 'https://api.intercom.io',
          headers: {
            Authorization: `Bearer ${ctx.output.token}`,
            Accept: 'application/json'
          }
        }),
        'profile lookup'
      );

      let response = await http.get('/me');
      let data = response.data;

      return {
        profile: {
          id: data.id,
          name: data.name,
          email: data.email,
          imageUrl: data.avatar?.image_url
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Access Token',
    key: 'access_token',

    inputSchema: z.object({
      token: z.string().describe('Intercom Access Token from your app in the Developer Hub')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let http = withIntercomErrors(
        createAxios({
          baseURL: 'https://api.intercom.io',
          headers: {
            Authorization: `Bearer ${ctx.output.token}`,
            Accept: 'application/json'
          }
        }),
        'profile lookup'
      );

      let response = await http.get('/me');
      let data = response.data;

      return {
        profile: {
          id: data.id,
          name: data.name,
          email: data.email,
          imageUrl: data.avatar?.image_url
        }
      };
    }
  });
