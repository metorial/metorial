import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

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
    name: 'Microsoft OAuth',
    key: 'microsoft_oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://learn.microsoft.com/en-us/graph/permissions-reference'
      }
    ],

    scopes: [
      {
        title: 'Datasets Read/Write',
        description: 'Read and write all datasets',
        scope: 'https://analysis.windows.net/powerbi/api/Dataset.ReadWrite.All'
      },
      {
        title: 'Datasets Read',
        description: 'Read all datasets',
        scope: 'https://analysis.windows.net/powerbi/api/Dataset.Read.All'
      },
      {
        title: 'Dashboards Read',
        description: 'Read all dashboards',
        scope: 'https://analysis.windows.net/powerbi/api/Dashboard.Read.All'
      },
      {
        title: 'Apps Read',
        description: 'Read all installed apps',
        scope: 'https://analysis.windows.net/powerbi/api/App.Read.All'
      },
      {
        title: 'Reports Read',
        description: 'Read all reports',
        scope: 'https://analysis.windows.net/powerbi/api/Report.Read.All'
      },
      {
        title: 'Reports Read/Write',
        description: 'Read and write all reports',
        scope: 'https://analysis.windows.net/powerbi/api/Report.ReadWrite.All'
      },
      {
        title: 'Dataflows Read',
        description: 'Read all dataflows',
        scope: 'https://analysis.windows.net/powerbi/api/Dataflow.Read.All'
      },
      {
        title: 'Dataflows Read/Write',
        description: 'Read and write all dataflows',
        scope: 'https://analysis.windows.net/powerbi/api/Dataflow.ReadWrite.All'
      },
      {
        title: 'Groups Read',
        description: 'Read user groups',
        scope: 'https://analysis.windows.net/powerbi/api/Group.Read'
      },
      {
        title: 'Groups Read All',
        description: 'Read all groups',
        scope: 'https://analysis.windows.net/powerbi/api/Group.Read.All'
      },
      {
        title: 'Content Create',
        description: 'Create content in Power BI',
        scope: 'https://analysis.windows.net/powerbi/api/Content.Create'
      },
      {
        title: 'Capacities Read',
        description: 'Read all capacities',
        scope: 'https://analysis.windows.net/powerbi/api/Capacity.Read.All'
      },
      {
        title: 'Capacities Read/Write',
        description: 'Read and write all capacities',
        scope: 'https://analysis.windows.net/powerbi/api/Capacity.ReadWrite.All'
      },
      {
        title: 'Pipelines Read',
        description: 'Read all deployment pipelines',
        scope: 'https://analysis.windows.net/powerbi/api/Pipeline.Read.All'
      },
      {
        title: 'Pipelines Read/Write',
        description: 'Read and write all deployment pipelines',
        scope: 'https://analysis.windows.net/powerbi/api/Pipeline.ReadWrite.All'
      },
      {
        title: 'Pipelines Deploy',
        description: 'Deploy content with deployment pipelines',
        scope: 'https://analysis.windows.net/powerbi/api/Pipeline.Deploy'
      },
      {
        title: 'Metadata View',
        description: 'View metadata for any item',
        scope: 'https://analysis.windows.net/powerbi/api/Metadata.View_Any'
      },
      {
        title: 'Data Alter',
        description: 'Alter any data',
        scope: 'https://analysis.windows.net/powerbi/api/Data.Alter_Any'
      },
      {
        title: 'Workspaces Read',
        description: 'Read all workspaces',
        scope: 'https://analysis.windows.net/powerbi/api/Workspace.Read.All'
      },
      {
        title: 'Workspaces Read/Write',
        description: 'Read and write all workspaces',
        scope: 'https://analysis.windows.net/powerbi/api/Workspace.ReadWrite.All'
      },
      {
        title: 'Offline Access',
        description: 'Maintain access with refresh tokens',
        scope: 'offline_access'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });

      let tenantId = (ctx.input as any)?.tenantId || 'common';
      let url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;

      return { url };
    },

    handleCallback: async ctx => {
      let tenantId = (ctx.input as any)?.tenantId || 'common';
      let tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

      let http = createAxios();
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        redirect_uri: ctx.redirectUri,
        grant_type: 'authorization_code',
        scope: ctx.scopes.join(' ')
      });

      let response = await http.post(tokenUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

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
        throw new Error('No refresh token available. Re-authenticate to obtain a new token.');
      }

      let tenantId = (ctx.input as any)?.tenantId || 'common';
      let tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

      let http = createAxios();
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        refresh_token: ctx.output.refreshToken,
        grant_type: 'refresh_token',
        scope: ctx.scopes.join(' ')
      });

      let response = await http.post(tokenUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

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
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: any;
      scopes: string[];
    }) => {
      let http = createAxios({
        baseURL: 'https://graph.microsoft.com/v1.0'
      });

      try {
        let response = await http.get('/me', {
          headers: { Authorization: `Bearer ${ctx.output.token}` }
        });

        let user = response.data;
        return {
          profile: {
            id: user.id,
            email: user.mail || user.userPrincipalName,
            name: user.displayName
          }
        };
      } catch {
        return {
          profile: {}
        };
      }
    }
  });
