import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { railwayApiError, railwayServiceError } from './lib/errors';

let httpClient = createAxios({
  baseURL: 'https://backboard.railway.com'
});

let authorizationHeaders = (token: string, tokenHeader?: string) =>
  tokenHeader === 'project-access-token'
    ? {
        'Project-Access-Token': token
      }
    : {
        Authorization: `Bearer ${token}`
      };

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      tokenHeader: z.enum(['authorization', 'project-access-token']).optional(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'Login with Railway',
    key: 'oauth',

    scopes: [
      {
        title: 'OpenID',
        description: 'Required for authentication (always included)',
        scope: 'openid'
      },
      {
        title: 'Email',
        description: 'Access your email address',
        scope: 'email'
      },
      {
        title: 'Profile',
        description: 'Access your name and picture',
        scope: 'profile'
      },
      {
        title: 'Offline Access',
        description: 'Stay connected with refresh tokens for long-lived access',
        scope: 'offline_access'
      },
      {
        title: 'Workspace Viewer',
        description: 'Viewer access to selected workspaces',
        scope: 'workspace:viewer'
      },
      {
        title: 'Workspace Member',
        description: 'Member access to selected workspaces',
        scope: 'workspace:member'
      },
      {
        title: 'Workspace Admin',
        description: 'Admin access to selected workspaces',
        scope: 'workspace:admin'
      },
      {
        title: 'Project Viewer',
        description: 'Viewer access to selected projects',
        scope: 'project:viewer'
      },
      {
        title: 'Project Member',
        description: 'Member access to selected projects',
        scope: 'project:member'
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

      if (ctx.scopes.includes('offline_access')) {
        params.set('prompt', 'consent');
      }

      return {
        url: `https://backboard.railway.com/oauth/auth?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response: any;
      try {
        response = await httpClient.post(
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
        throw railwayApiError(error, 'OAuth callback');
      }

      let data = response.data;
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
        throw railwayServiceError(
          'Railway OAuth token refresh failed: no refresh token is available. Reconnect Railway with the offline_access scope.'
        );
      }

      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response: any;
      try {
        response = await httpClient.post(
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
        throw railwayApiError(error, 'OAuth token refresh');
      }

      let data = response.data;
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

    getProfile: async (ctx: {
      output: { token: string };
      input: Record<string, never>;
      scopes: string[];
    }) => {
      let response: any;
      try {
        response = await httpClient.get('/oauth/me', {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`
          }
        });
      } catch (error) {
        throw railwayApiError(error, 'OAuth profile');
      }

      let data = response.data;

      return {
        profile: {
          id: data.sub,
          email: data.email,
          name: data.name,
          imageUrl: data.picture
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z.string().describe('Railway API token'),
      tokenType: z
        .enum(['account_or_workspace', 'project'])
        .optional()
        .default('account_or_workspace')
        .describe(
          'Use "project" for Railway project tokens, which require the Project-Access-Token header. Account and workspace tokens use Authorization: Bearer.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          tokenHeader:
            ctx.input.tokenType === 'project' ? 'project-access-token' : 'authorization'
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; tokenHeader?: string };
      input: { token: string; tokenType?: 'account_or_workspace' | 'project' };
    }) => {
      let isProjectToken = ctx.output.tokenHeader === 'project-access-token';
      let response: any;

      try {
        response = await httpClient.post(
          '/graphql/v2',
          {
            query: isProjectToken
              ? `query { projectToken { id name projectId environmentId } }`
              : `query { apiToken { workspaces { id name } } }`
          },
          {
            headers: {
              ...authorizationHeaders(ctx.output.token, ctx.output.tokenHeader),
              'Content-Type': 'application/json'
            }
          }
        );
      } catch (error) {
        throw railwayApiError(error, 'API token profile');
      }

      if (response.data?.errors?.length > 0) {
        let message = response.data.errors.map((error: any) => error.message).join(', ');
        throw railwayServiceError(`Railway API token profile failed: ${message}`);
      }

      if (isProjectToken) {
        let token = response.data?.data?.projectToken;

        return {
          profile: {
            id:
              token?.id ?? `${token?.projectId ?? 'project'}:${token?.environmentId ?? 'env'}`,
            name: token?.name ?? 'Railway Project Token'
          }
        };
      }

      let workspaces = response.data?.data?.apiToken?.workspaces ?? [];
      let workspace = Array.isArray(workspaces) ? workspaces[0] : undefined;

      return {
        profile: {
          id: workspace?.id ?? 'railway-api-token',
          name: workspace?.name ?? 'Railway API Token'
        }
      };
    }
  });
