import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { postHogApiError, postHogServiceError } from './lib/errors';

type OAuthInput = {
  instanceUrl?: string;
  projectToken?: string;
};

type AuthOutput = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  projectToken?: string;
};

type TokenInput = {
  apiKey: string;
  projectToken?: string;
};

let getOAuthBaseUrl = (input: OAuthInput) => input.instanceUrl || 'https://oauth.posthog.com';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      projectToken: z.string().optional()
    })
  )
  .addOauth<OAuthInput>({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth',

    scopes: [
      { title: 'OpenID', description: 'OpenID Connect authentication', scope: 'openid' },
      { title: 'Profile', description: 'Access user profile information', scope: 'profile' },
      { title: 'Read Actions', description: 'Read actions', scope: 'action:read' },
      {
        title: 'Write Actions',
        description: 'Create and update actions',
        scope: 'action:write'
      },
      {
        title: 'Read Activity Log',
        description: 'Read activity log entries',
        scope: 'activity_log:read'
      },
      { title: 'Read Annotations', description: 'Read annotations', scope: 'annotation:read' },
      {
        title: 'Write Annotations',
        description: 'Create and update annotations',
        scope: 'annotation:write'
      },
      { title: 'Read Cohorts', description: 'Read cohorts', scope: 'cohort:read' },
      {
        title: 'Write Cohorts',
        description: 'Create and update cohorts',
        scope: 'cohort:write'
      },
      { title: 'Read Dashboards', description: 'Read dashboards', scope: 'dashboard:read' },
      {
        title: 'Write Dashboards',
        description: 'Create and update dashboards',
        scope: 'dashboard:write'
      },
      {
        title: 'Read Experiments',
        description: 'Read experiments (A/B tests)',
        scope: 'experiment:read'
      },
      {
        title: 'Write Experiments',
        description: 'Create and update experiments',
        scope: 'experiment:write'
      },
      {
        title: 'Read Feature Flags',
        description: 'Read feature flags',
        scope: 'feature_flag:read'
      },
      {
        title: 'Write Feature Flags',
        description: 'Create and update feature flags',
        scope: 'feature_flag:write'
      },
      { title: 'Read Insights', description: 'Read insights', scope: 'insight:read' },
      {
        title: 'Write Insights',
        description: 'Create and update insights',
        scope: 'insight:write'
      },
      {
        title: 'Read Groups',
        description: 'Read groups and group types',
        scope: 'group:read'
      },
      {
        title: 'Write Groups',
        description: 'Create and update group properties',
        scope: 'group:write'
      },
      { title: 'Read Persons', description: 'Read person profiles', scope: 'person:read' },
      {
        title: 'Write Persons',
        description: 'Update and delete person profiles',
        scope: 'person:write'
      },
      {
        title: 'Read Organizations',
        description: 'Read organizations and discover projects',
        scope: 'organization:read'
      },
      {
        title: 'Read Users',
        description: 'Read the current user profile',
        scope: 'user:read'
      },
      { title: 'Read Projects', description: 'Read project settings', scope: 'project:read' },
      {
        title: 'Write Projects',
        description: 'Update project settings',
        scope: 'project:write'
      },
      {
        title: 'Read Session Recordings',
        description: 'Read session recording metadata',
        scope: 'session_recording:read'
      },
      { title: 'Read Surveys', description: 'Read surveys', scope: 'survey:read' },
      {
        title: 'Write Surveys',
        description: 'Create and update surveys',
        scope: 'survey:write'
      },
      {
        title: 'Read Event Definitions',
        description: 'Read event definitions',
        scope: 'event_definition:read'
      },
      {
        title: 'Read Property Definitions',
        description: 'Read property definitions',
        scope: 'property_definition:read'
      },
      { title: 'Read Query', description: 'Run HogQL queries', scope: 'query:read' }
    ],

    inputSchema: z.object({
      instanceUrl: z
        .string()
        .optional()
        .describe('PostHog instance URL (leave empty for US cloud)'),
      projectToken: z
        .string()
        .optional()
        .describe('Project API key/token for event capture and flag evaluation')
    }),

    getAuthorizationUrl: async ctx => {
      let baseUrl = getOAuthBaseUrl(ctx.input);
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state
      });

      return {
        url: `${baseUrl}/oauth/authorize?${params.toString()}`,
        input: ctx.input
      };
    },

    handleCallback: async ctx => {
      let baseUrl = getOAuthBaseUrl(ctx.input);
      let http = createAxios({ baseURL: baseUrl });

      let response: any;
      try {
        response = await http.post('/oauth/token', {
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        });
      } catch (error) {
        throw postHogApiError(error, 'exchange OAuth authorization code');
      }

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          projectToken: ctx.input.projectToken
        },
        input: ctx.input
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw postHogServiceError(
          'PostHog OAuth refresh token is missing. Reconnect the account.'
        );
      }

      let baseUrl = getOAuthBaseUrl(ctx.input);
      let http = createAxios({ baseURL: baseUrl });

      let response: any;
      try {
        response = await http.post('/oauth/token', {
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        });
      } catch (error) {
        throw postHogApiError(error, 'refresh OAuth token');
      }

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt,
          projectToken: ctx.output.projectToken
        },
        input: ctx.input
      };
    },

    getProfile: async (ctx: { output: AuthOutput; input: OAuthInput; scopes: string[] }) => {
      let baseUrl = ctx.input.instanceUrl || 'https://us.posthog.com';
      let http = createAxios({
        baseURL: baseUrl,
        headers: { Authorization: `Bearer ${ctx.output.token}` }
      });

      let response: any;
      try {
        response = await http.get('/api/users/@me/');
      } catch (error) {
        throw postHogApiError(error, 'get OAuth profile');
      }
      let user = response.data;

      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || undefined
        }
      };
    }
  })
  .addTokenAuth<TokenInput>({
    type: 'auth.token',
    name: 'Personal API Key',
    key: 'personal_api_key',

    inputSchema: z.object({
      apiKey: z.string().describe('Personal API key (starts with phx_)'),
      projectToken: z
        .string()
        .optional()
        .describe('Project API key/token for event capture and flag evaluation')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          projectToken: ctx.input.projectToken
        }
      };
    },

    getProfile: async (ctx: { output: AuthOutput; input: TokenInput }) => {
      let http = createAxios({
        baseURL: 'https://us.posthog.com',
        headers: { Authorization: `Bearer ${ctx.output.token}` }
      });

      try {
        let response = await http.get('/api/users/@me/');
        let user = response.data;

        return {
          profile: {
            id: String(user.id),
            email: user.email,
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || undefined
          }
        };
      } catch (error) {
        throw postHogApiError(error, 'get token auth profile');
      }
    }
  });
