import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { asanaApiError, asanaServiceError } from './lib/errors';

let asanaApi = createAxios({
  baseURL: 'https://app.asana.com/api/1.0'
});

let asanaAuth = createAxios({
  baseURL: 'https://app.asana.com'
});

let outputSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional()
});

type AuthOutput = z.infer<typeof outputSchema>;

let fetchProfile = async (token: string) => {
  let response: any;
  try {
    response = await asanaApi.get('/users/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  } catch (error) {
    throw asanaApiError(error, 'fetch profile');
  }

  let user = response.data.data;

  return {
    profile: {
      id: user.gid,
      name: user.name,
      email: user.email,
      imageUrl: user.photo?.image_128x128
    }
  };
};

export let auth = SlateAuth.create()
  .output(outputSchema)
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developers.asana.com/docs/oauth'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.asana.com/docs/oauth-scopes'
      }
    ],

    scopes: [
      {
        title: 'Attachments Read',
        description: 'Read file attachments on tasks',
        scope: 'attachments:read'
      },
      {
        title: 'Attachments Write',
        description: 'Upload file attachments to tasks',
        scope: 'attachments:write'
      },
      {
        title: 'Attachments Delete',
        description: 'Delete file attachments from tasks',
        scope: 'attachments:delete'
      },
      {
        title: 'Custom Fields Read',
        description: 'Read custom field definitions and values',
        scope: 'custom_fields:read'
      },
      {
        title: 'Custom Fields Write',
        description: 'Create and update custom fields',
        scope: 'custom_fields:write'
      },
      {
        title: 'Goals Read',
        description: 'Read goals and their parent goals',
        scope: 'goals:read'
      },
      { title: 'Jobs Read', description: 'Read background job statuses', scope: 'jobs:read' },
      {
        title: 'Portfolios Read',
        description: 'Read portfolios and their contents',
        scope: 'portfolios:read'
      },
      {
        title: 'Portfolios Write',
        description: 'Create and update portfolios',
        scope: 'portfolios:write'
      },
      {
        title: 'Project Templates Read',
        description: 'Read project templates',
        scope: 'project_templates:read'
      },
      {
        title: 'Projects Read',
        description: 'Read projects and their details',
        scope: 'projects:read'
      },
      {
        title: 'Projects Write',
        description: 'Create and update projects',
        scope: 'projects:write'
      },
      { title: 'Projects Delete', description: 'Delete projects', scope: 'projects:delete' },
      {
        title: 'Stories Read',
        description: 'Read comments and activity on tasks',
        scope: 'stories:read'
      },
      {
        title: 'Stories Write',
        description: 'Create comments on tasks',
        scope: 'stories:write'
      },
      { title: 'Tags Read', description: 'Read tags', scope: 'tags:read' },
      { title: 'Tags Write', description: 'Create and update tags', scope: 'tags:write' },
      {
        title: 'Task Templates Read',
        description: 'Read task templates',
        scope: 'task_templates:read'
      },
      {
        title: 'Tasks Read',
        description: 'Read tasks and their details',
        scope: 'tasks:read'
      },
      { title: 'Tasks Write', description: 'Create and update tasks', scope: 'tasks:write' },
      { title: 'Tasks Delete', description: 'Delete tasks', scope: 'tasks:delete' },
      {
        title: 'Team Memberships Read',
        description: 'Read team membership information',
        scope: 'team_memberships:read'
      },
      { title: 'Teams Read', description: 'Read team information', scope: 'teams:read' },
      {
        title: 'Time Tracking Read',
        description: 'Read time tracking entries on tasks',
        scope: 'time_tracking_entries:read'
      },
      {
        title: 'Users Read',
        description: 'Read user profiles and information',
        scope: 'users:read'
      },
      {
        title: 'Webhooks Read',
        description: 'Read webhook subscriptions',
        scope: 'webhooks:read'
      },
      {
        title: 'Webhooks Write',
        description: 'Create and update webhook subscriptions',
        scope: 'webhooks:write'
      },
      {
        title: 'Webhooks Delete',
        description: 'Delete webhook subscriptions',
        scope: 'webhooks:delete'
      },
      {
        title: 'Workspaces Read',
        description: 'Read workspace information',
        scope: 'workspaces:read'
      },
      {
        title: 'Typeahead Read',
        description: 'Use workspace typeahead search',
        scope: 'workspaces.typeahead:read'
      },
      {
        title: 'OpenID Connect',
        description: 'OpenID Connect authentication',
        scope: 'openid'
      },
      { title: 'Email', description: 'Access user email address', scope: 'email' },
      { title: 'Profile', description: 'Access user profile information', scope: 'profile' }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `https://app.asana.com/-/oauth_authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response: any;
      try {
        response = await asanaAuth.post(
          '/-/oauth_token',
          new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            redirect_uri: ctx.redirectUri,
            code: ctx.code
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
      } catch (error) {
        throw asanaApiError(error, 'exchange OAuth code');
      }

      let data = response.data;
      if (!data.access_token) {
        throw asanaServiceError('Asana OAuth token exchange did not return an access token.');
      }

      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

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
        throw asanaServiceError('No Asana refresh token is available.');
      }

      let response: any;
      try {
        response = await asanaAuth.post(
          '/-/oauth_token',
          new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            refresh_token: ctx.output.refreshToken
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
      } catch (error) {
        throw asanaApiError(error, 'refresh OAuth token');
      }

      let data = response.data;
      if (!data.access_token) {
        throw asanaServiceError('Asana OAuth refresh did not return an access token.');
      }

      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: { output: AuthOutput }) => {
      return fetchProfile(ctx.output.token);
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'pat',

    inputSchema: z.object({
      token: z.string().describe('Asana Personal Access Token')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: AuthOutput }) => {
      return fetchProfile(ctx.output.token);
    }
  });
