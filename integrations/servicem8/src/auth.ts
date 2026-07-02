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
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developer.servicem8.com/docs/authentication'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developer.servicem8.com/docs/authentication'
      }
    ],

    scopes: [
      { title: 'Read Jobs', description: 'Read-only access to jobs', scope: 'read_jobs' },
      { title: 'Create Jobs', description: 'Create new jobs', scope: 'create_jobs' },
      {
        title: 'Manage Jobs',
        description: 'Full access to jobs (read, create, update, delete)',
        scope: 'manage_jobs'
      },
      {
        title: 'Read Customers',
        description: 'Read-only access to clients/companies',
        scope: 'read_customers'
      },
      {
        title: 'Create Customers',
        description: 'Create new clients/companies',
        scope: 'create_customers'
      },
      {
        title: 'Manage Customers',
        description: 'Full access to clients/companies',
        scope: 'manage_customers'
      },
      {
        title: 'Read Staff',
        description: 'Read-only access to staff members',
        scope: 'read_staff'
      },
      {
        title: 'Manage Staff',
        description: 'Full access to staff members',
        scope: 'manage_staff'
      },
      {
        title: 'Read Schedule',
        description: 'Read-only access to scheduling and job activities',
        scope: 'read_schedule'
      },
      {
        title: 'Manage Schedule',
        description: 'Full access to scheduling and job activities',
        scope: 'manage_schedule'
      },
      {
        title: 'Read Locations',
        description: 'Read-only access to locations',
        scope: 'read_locations'
      },
      {
        title: 'Manage Locations',
        description: 'Full access to locations',
        scope: 'manage_locations'
      },
      {
        title: 'Read Assets',
        description: 'Read-only access to customer assets',
        scope: 'read_assets'
      },
      {
        title: 'Manage Assets',
        description: 'Full access to customer assets',
        scope: 'manage_assets'
      },
      {
        title: 'Read Job Materials',
        description: 'Read-only access to job materials/line items',
        scope: 'read_job_materials'
      },
      {
        title: 'Manage Job Materials',
        description: 'Full access to job materials/line items',
        scope: 'manage_job_materials'
      },
      {
        title: 'Read Job Contacts',
        description: 'Read-only access to job contacts',
        scope: 'read_job_contacts'
      },
      {
        title: 'Read Inventory',
        description: 'Read-only access to materials catalog',
        scope: 'read_inventory'
      },
      {
        title: 'Manage Inventory',
        description: 'Full access to materials catalog',
        scope: 'manage_inventory'
      },
      {
        title: 'Publish SMS',
        description: 'Send SMS messages on behalf of the account',
        scope: 'publish_sms'
      },
      {
        title: 'Publish Email',
        description: 'Send emails on behalf of the account',
        scope: 'publish_email'
      },
      {
        title: 'Staff Locations',
        description: 'Access staff location tracking',
        scope: 'staff_locations'
      },
      {
        title: 'Staff Activity',
        description: 'Access staff activity tracking',
        scope: 'staff_activity'
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

      return {
        url: `https://go.servicem8.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let http = createAxios({
        baseURL: 'https://go.servicem8.com'
      });

      let response = await http.post(
        '/oauth/access_token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;
      let expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let http = createAxios({
        baseURL: 'https://go.servicem8.com'
      });

      let response = await http.post(
        '/oauth/access_token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.output.refreshToken || ''
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;
      let expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z.string().describe('Your ServiceM8 API key from Settings > API Keys')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
