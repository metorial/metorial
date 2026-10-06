import { createAxios, requestAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { adaptError, apiOrigin, US_API, validateToken } from './lib/http';
import { malformed } from './lib/response';

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
        url: 'https://api.surveymonkey.com/v3/docs#authentication'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://api.surveymonkey.com/v3/docs#scopes'
      }
    ],

    scopes: [
      { title: 'View Users', description: 'View Users', scope: 'users_read' },
      { title: 'View Surveys', description: 'View Surveys', scope: 'surveys_read' },
      {
        title: 'Create/Modify Surveys',
        description: 'Create/Modify Surveys',
        scope: 'surveys_write'
      },
      { title: 'View Collectors', description: 'View Collectors', scope: 'collectors_read' },
      {
        title: 'Create/Modify Collectors',
        description: 'Create/Modify Collectors',
        scope: 'collectors_write'
      },
      { title: 'View Contacts', description: 'View Contacts', scope: 'contacts_read' },
      {
        title: 'Create/Modify Contacts',
        description: 'Create/Modify Contacts',
        scope: 'contacts_write'
      },
      { title: 'View Responses', description: 'View Responses', scope: 'responses_read' },
      {
        title: 'View Response Details',
        description: 'View Response Details',
        scope: 'responses_read_detail'
      },
      { title: 'View Library', description: 'View Library', scope: 'library_read' }
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
        baseURL: US_API,
        timeout: 30000,
        maxRedirects: 0,
        maxContentLength: 1024 * 1024
      });

      let body = new URLSearchParams({
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        redirect_uri: ctx.redirectUri,
        grant_type: 'authorization_code'
      });

      let response = await requestAxios(
        'authorization-code exchange',
        () =>
          http.post<unknown>('/oauth/token', body.toString(), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }),
        adaptError
      );
      let result = z
        .object({ access_token: z.string().min(1), access_url: z.string().optional() })
        .safeParse(response.data);
      if (response.status !== 200 || !result.success) throw malformed();
      let accessUrl = apiOrigin(result.data.access_url);

      return {
        output: {
          token: validateToken(result.data.access_token),
          accessUrl
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; accessUrl?: string };
      input: Record<string, never>;
      scopes: string[];
    }) => {
      let user = await new Client(ctx.output).getCurrentUser();

      return {
        profile: {
          id: user.id,
          email: user.email,
          name:
            `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() ||
            user.username ||
            user.id,
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
          token: validateToken(ctx.input.token),
          accessUrl: apiOrigin(ctx.input.accessUrl)
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; accessUrl?: string };
      input: { token: string; accessUrl?: string };
    }) => {
      let user = await new Client(ctx.output).getCurrentUser();

      return {
        profile: {
          id: user.id,
          email: user.email,
          name:
            `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() ||
            user.username ||
            user.id,
          username: user.username,
          accountType: user.account_type
        }
      };
    }
  });
