import { createApiServiceError, createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { supabaseApiError } from './lib/errors';

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
        title: 'All Read',
        description: 'Read access to all Management API resources',
        scope: 'all:read'
      },
      {
        title: 'All Write',
        description: 'Write access to all Management API resources',
        scope: 'all:write'
      },
      {
        title: 'Auth Read',
        description: 'Read access to Auth configuration',
        scope: 'auth:read'
      },
      {
        title: 'Auth Write',
        description: 'Write access to Auth configuration',
        scope: 'auth:write'
      },
      {
        title: 'Database Read',
        description: 'Read access to database configuration',
        scope: 'database:read'
      },
      {
        title: 'Database Write',
        description: 'Write access to database configuration',
        scope: 'database:write'
      },
      {
        title: 'Domains Read',
        description: 'Read access to custom domains',
        scope: 'domains:read'
      },
      {
        title: 'Domains Write',
        description: 'Write access to custom domains',
        scope: 'domains:write'
      },
      {
        title: 'Edge Functions Read',
        description: 'Read access to Edge Functions',
        scope: 'edge_functions:read'
      },
      {
        title: 'Edge Functions Write',
        description: 'Write access to Edge Functions',
        scope: 'edge_functions:write'
      },
      {
        title: 'Environment Read',
        description: 'Read access to environment variables',
        scope: 'environment:read'
      },
      {
        title: 'Environment Write',
        description: 'Write access to environment variables',
        scope: 'environment:write'
      },
      {
        title: 'Organizations Read',
        description: 'Read access to organizations',
        scope: 'organizations:read'
      },
      {
        title: 'Organizations Write',
        description: 'Write access to organizations',
        scope: 'organizations:write'
      },
      {
        title: 'Projects Read',
        description: 'Read access to projects',
        scope: 'projects:read'
      },
      {
        title: 'Projects Write',
        description: 'Write access to projects',
        scope: 'projects:write'
      },
      {
        title: 'REST Read',
        description: 'Read access to REST API configuration',
        scope: 'rest:read'
      },
      {
        title: 'REST Write',
        description: 'Write access to REST API configuration',
        scope: 'rest:write'
      },
      {
        title: 'Secrets Read',
        description: 'Read access to secrets',
        scope: 'secrets:read'
      },
      {
        title: 'Secrets Write',
        description: 'Write access to secrets',
        scope: 'secrets:write'
      },
      {
        title: 'Storage Read',
        description: 'Read access to storage configuration',
        scope: 'storage:read'
      },
      {
        title: 'Storage Write',
        description: 'Write access to storage configuration',
        scope: 'storage:write'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        response_type: 'code',
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `https://api.supabase.com/v1/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let http = createAxios();
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      try {
        let response = await http.post(
          'https://api.supabase.com/v1/oauth/token',
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

        let data = response.data;

        return {
          output: {
            token: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: data.expires_at ? String(data.expires_at) : undefined
          }
        };
      } catch (error) {
        throw supabaseApiError(error, 'OAuth token exchange');
      }
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError('Supabase OAuth refresh requires a refresh token.');
      }

      let http = createAxios();
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      try {
        let response = await http.post(
          'https://api.supabase.com/v1/oauth/token',
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

        let data = response.data;

        return {
          output: {
            token: data.access_token,
            refreshToken: data.refresh_token ?? ctx.output.refreshToken,
            expiresAt: data.expires_at ? String(data.expires_at) : undefined
          }
        };
      } catch (error) {
        throw supabaseApiError(error, 'OAuth token refresh');
      }
    },

    getProfile: async (ctx: any) => {
      let http = createAxios({
        baseURL: 'https://api.supabase.com/v1',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      try {
        let response = await http.get('/organizations');
        let orgs = response.data;
        let firstOrg = Array.isArray(orgs) && orgs.length > 0 ? orgs[0] : null;

        return {
          profile: {
            id: firstOrg?.id ?? undefined,
            name: firstOrg?.name ?? 'Supabase User'
          }
        };
      } catch (error) {
        throw supabaseApiError(error, 'OAuth profile lookup');
      }
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_access_token',

    inputSchema: z.object({
      token: z.string().describe('Supabase Personal Access Token (starts with sbp_)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let http = createAxios({
        baseURL: 'https://api.supabase.com/v1',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      try {
        let response = await http.get('/organizations');
        let orgs = response.data;
        let firstOrg = Array.isArray(orgs) && orgs.length > 0 ? orgs[0] : null;

        return {
          profile: {
            id: firstOrg?.id ?? undefined,
            name: firstOrg?.name ?? 'Supabase User'
          }
        };
      } catch (error) {
        throw supabaseApiError(error, 'token profile lookup');
      }
    }
  });
