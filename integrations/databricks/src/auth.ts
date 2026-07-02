import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth (User Authorization)',
    key: 'oauth_u2m',

    scopes: [
      {
        title: 'All APIs',
        description: 'Full access to all Databricks APIs',
        scope: 'all-apis'
      },
      {
        title: 'SQL',
        description: 'Access to Databricks SQL APIs',
        scope: 'sql'
      },
      {
        title: 'Files',
        description: 'Access to file management APIs',
        scope: 'file.files'
      },
      {
        title: 'Clusters',
        description: 'Access to cluster management APIs',
        scope: 'clusters'
      },
      {
        title: 'Offline Access',
        description: 'Obtain refresh tokens for long-lived access',
        scope: 'offline_access'
      }
    ],

    inputSchema: z.object({
      workspaceUrl: z
        .string()
        .describe(
          'Databricks workspace URL (e.g., https://adb-1234567890123456.7.azuredatabricks.net)'
        )
    }),

    getAuthorizationUrl: async ctx => {
      let host = ctx.input.workspaceUrl.replace(/\/+$/, '');
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        scope: ctx.scopes.join(' '),
        code_challenge: ctx.state,
        code_challenge_method: 'plain'
      });

      return {
        url: `${host}/oidc/v1/authorize?${params.toString()}`,
        input: ctx.input
      };
    },

    handleCallback: async ctx => {
      let host = ctx.input.workspaceUrl.replace(/\/+$/, '');
      let http = createAxios({ baseURL: host });

      let response = await http.post(
        '/oidc/v1/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code_verifier: ctx.state
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = response.data as any;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token
        },
        input: ctx.input
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let host = ctx.input.workspaceUrl.replace(/\/+$/, '');
      let http = createAxios({ baseURL: host });

      let response = await http.post(
        '/oidc/v1/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken ?? '',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = response.data as any;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token ?? ctx.output.refreshToken
        },
        input: ctx.input
      };
    },

    getProfile: async (ctx: any) => {
      let host = ctx.input.workspaceUrl.replace(/\/+$/, '');
      let http = createAxios({
        baseURL: host,
        headers: { Authorization: `Bearer ${ctx.output.token}` }
      });

      let response = await http.get('/api/2.0/preview/scim/v2/Me');
      let user = response.data as any;

      return {
        profile: {
          id: user.id,
          email: user.emails?.[0]?.value ?? user.userName,
          name: user.displayName ?? user.userName
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_access_token',

    inputSchema: z.object({
      token: z.string().describe('Databricks personal access token')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'OAuth (Machine-to-Machine)',
    key: 'oauth_m2m',

    inputSchema: z.object({
      clientId: z.string().describe('Service principal client ID'),
      clientSecret: z.string().describe('Service principal OAuth secret'),
      workspaceUrl: z
        .string()
        .describe(
          'Databricks workspace URL (e.g., https://adb-1234567890123456.7.azuredatabricks.net)'
        )
    }),

    getOutput: async ctx => {
      let host = ctx.input.workspaceUrl.replace(/\/+$/, '');
      let http = createAxios({ baseURL: host });

      let response = await http.post(
        '/oidc/v1/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: ctx.input.clientId,
          client_secret: ctx.input.clientSecret,
          scope: 'all-apis'
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = response.data as any;

      return {
        output: {
          token: data.access_token
        }
      };
    }
  });
