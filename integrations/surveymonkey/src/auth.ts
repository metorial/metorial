import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      accessUrl: z.string().optional()
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
        url: 'https://api.surveymonkey.com/v3/docs/authentication'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://api.surveymonkey.com/v3/docs/scopes'
      }
    ],

    scopes: [
      { title: 'View Users', description: 'View user account details', scope: 'users_read' },
      { title: 'View Surveys', description: 'View surveys', scope: 'surveys_read' },
      {
        title: 'Create/Modify Surveys',
        description: 'Create and modify surveys',
        scope: 'surveys_write'
      },
      {
        title: 'View Collectors',
        description: 'View survey collectors',
        scope: 'collectors_read'
      },
      {
        title: 'Create/Modify Collectors',
        description: 'Create and modify collectors',
        scope: 'collectors_write'
      },
      {
        title: 'View Contacts',
        description: 'View contacts and contact lists',
        scope: 'contacts_read'
      },
      {
        title: 'Create/Modify Contacts',
        description: 'Create and modify contacts and contact lists',
        scope: 'contacts_write'
      },
      {
        title: 'View Responses',
        description: 'View survey responses (summary)',
        scope: 'responses_read'
      },
      {
        title: 'View Response Details',
        description: 'View full survey response details',
        scope: 'responses_read_detail'
      },
      {
        title: 'Create/Modify Responses',
        description: 'Create and modify survey responses',
        scope: 'responses_write'
      },
      { title: 'View Groups', description: 'View team groups', scope: 'groups_read' },
      { title: 'Manage Groups', description: 'Manage team groups', scope: 'groups_write' },
      { title: 'View Webhooks', description: 'View webhooks', scope: 'webhooks_read' },
      {
        title: 'Create/Modify Webhooks',
        description: 'Create and modify webhooks',
        scope: 'webhooks_write'
      },
      {
        title: 'View Library',
        description: 'View survey template library',
        scope: 'library_read'
      },
      { title: 'View Workgroups', description: 'View workgroups', scope: 'workgroups_read' },
      {
        title: 'Manage Workgroups',
        description: 'Manage workgroups',
        scope: 'workgroups_write'
      },
      {
        title: 'View Workgroup Shares',
        description: 'View shared workgroup resources',
        scope: 'workgroups_shares_read'
      },
      {
        title: 'Manage Workgroup Shares',
        description: 'Manage shared workgroup resources',
        scope: 'workgroups_shares_write'
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
        url: `https://api.surveymonkey.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let http = createAxios({
        baseURL: 'https://api.surveymonkey.com'
      });

      let body = new URLSearchParams({
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        redirect_uri: ctx.redirectUri,
        grant_type: 'authorization_code'
      });

      let response = await http.post('/oauth/token', body.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      let accessUrl = response.data.access_url || 'https://api.surveymonkey.com';

      return {
        output: {
          token: response.data.access_token,
          accessUrl
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; accessUrl?: string };
      input: Record<string, never>;
      scopes: string[];
    }) => {
      let baseUrl = ctx.output.accessUrl || 'https://api.surveymonkey.com';
      let http = createAxios({
        baseURL: baseUrl,
        headers: {
          Authorization: `bearer ${ctx.output.token}`
        }
      });

      let response = await http.get('/v3/users/me');
      let user = response.data;

      return {
        profile: {
          id: user.id,
          email: user.email,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          username: user.username,
          accountType: user.account_type
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Access Token',
    key: 'access_token',

    inputSchema: z.object({
      token: z.string(),
      accessUrl: z
        .string()
        .optional()
        .describe(
          'API base URL (e.g. https://api.surveymonkey.com, https://api.eu.surveymonkey.com, or https://api.surveymonkey.ca). Defaults to US datacenter.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          accessUrl: ctx.input.accessUrl || 'https://api.surveymonkey.com'
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; accessUrl?: string };
      input: { token: string; accessUrl?: string };
    }) => {
      let baseUrl = ctx.output.accessUrl || 'https://api.surveymonkey.com';
      let http = createAxios({
        baseURL: baseUrl,
        headers: {
          Authorization: `bearer ${ctx.output.token}`
        }
      });

      let response = await http.get('/v3/users/me');
      let user = response.data;

      return {
        profile: {
          id: user.id,
          email: user.email,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          username: user.username,
          accountType: user.account_type
        }
      };
    }
  });
