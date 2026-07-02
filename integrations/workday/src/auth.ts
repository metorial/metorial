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
    name: 'OAuth 2.0',
    key: 'oauth',

    scopes: [
      {
        title: 'Staffing',
        description: 'Access to worker records, hiring, terminations, and staffing data',
        scope: 'Staffing'
      },
      {
        title: 'Public Data',
        description: 'Access to public worker profile data',
        scope: 'Public Data'
      },
      {
        title: 'Recruiting',
        description: 'Access to job requisitions and candidate data',
        scope: 'Recruiting'
      },
      {
        title: 'Tenant Non-Configurable',
        description: 'Access to tenant-level non-configurable data',
        scope: 'Tenant Non-Configurable'
      },
      {
        title: 'Time Tracking',
        description: 'Access to time tracking and time-off data',
        scope: 'Time Tracking'
      },
      {
        title: 'Absence Management',
        description: 'Access to absence and leave management data',
        scope: 'Absence Management'
      },
      {
        title: 'Benefits',
        description: 'Access to benefits enrollment and plan data',
        scope: 'Benefits'
      },
      {
        title: 'Compensation',
        description: 'Access to compensation data',
        scope: 'Compensation'
      },
      {
        title: 'Integration',
        description: 'Access to integration system resources',
        scope: 'Integration'
      },
      {
        title: 'WQL',
        description: 'Access to Workday Query Language for querying data',
        scope: 'System'
      }
    ],

    inputSchema: z.object({
      baseUrl: z
        .string()
        .describe('Workday REST API base URL (e.g., https://wd2-impl-services1.workday.com)'),
      tenant: z.string().describe('Workday tenant name')
    }),

    getAuthorizationUrl: async ctx => {
      let baseUrl = ctx.input.baseUrl.replace(/\/$/, '');
      let scopes = ctx.scopes.join(' ');
      let url = `${baseUrl}/authorize?client_id=${encodeURIComponent(ctx.clientId)}&redirect_uri=${encodeURIComponent(ctx.redirectUri)}&response_type=code&state=${encodeURIComponent(ctx.state)}&scope=${encodeURIComponent(scopes)}`;

      return { url, input: ctx.input };
    },

    handleCallback: async ctx => {
      let baseUrl = ctx.input.baseUrl.replace(/\/$/, '');
      let tokenUrl = `${baseUrl}/ccx/oauth2/${ctx.input.tenant}/token`;

      let ax = createAxios({ baseURL: baseUrl });

      let params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('code', ctx.code);
      params.append('redirect_uri', ctx.redirectUri);
      params.append('client_id', ctx.clientId);
      params.append('client_secret', ctx.clientSecret);

      let response = await ax.post(tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      let data = response.data as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type: string;
      };

      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        },
        input: ctx.input
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw new Error('No refresh token available');
      }

      let baseUrl = ctx.input.baseUrl.replace(/\/$/, '');
      let tokenUrl = `${baseUrl}/ccx/oauth2/${ctx.input.tenant}/token`;

      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let ax = createAxios({ baseURL: baseUrl });

      let params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', ctx.output.refreshToken);

      let response = await ax.post(tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`
        }
      });

      let data = response.data as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type: string;
      };

      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt
        },
        input: ctx.input
      };
    }
  });
