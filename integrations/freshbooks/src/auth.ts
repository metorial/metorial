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
    name: 'OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://www.freshbooks.com/api/authentication'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://www.freshbooks.com/api/scopes'
      }
    ],

    scopes: [
      {
        title: 'Profile Read',
        description: 'Read your profile information',
        scope: 'user:profile:read'
      },
      {
        title: 'Clients Read',
        description: 'Read client records',
        scope: 'user:clients:read'
      },
      {
        title: 'Clients Write',
        description: 'Create and update client records',
        scope: 'user:clients:write'
      },
      { title: 'Invoices Read', description: 'Read invoices', scope: 'user:invoices:read' },
      {
        title: 'Invoices Write',
        description: 'Create and update invoices',
        scope: 'user:invoices:write'
      },
      { title: 'Payments Read', description: 'Read payments', scope: 'user:payments:read' },
      {
        title: 'Payments Write',
        description: 'Create and update payments',
        scope: 'user:payments:write'
      },
      { title: 'Estimates Read', description: 'Read estimates', scope: 'user:estimates:read' },
      {
        title: 'Estimates Write',
        description: 'Create and update estimates',
        scope: 'user:estimates:write'
      },
      { title: 'Expenses Read', description: 'Read expenses', scope: 'user:expenses:read' },
      {
        title: 'Expenses Write',
        description: 'Create and update expenses',
        scope: 'user:expenses:write'
      },
      {
        title: 'Time Entries Read',
        description: 'Read time entries',
        scope: 'user:time_entries:read'
      },
      {
        title: 'Time Entries Write',
        description: 'Create and update time entries',
        scope: 'user:time_entries:write'
      },
      { title: 'Projects Read', description: 'Read projects', scope: 'user:projects:read' },
      {
        title: 'Projects Write',
        description: 'Create and update projects',
        scope: 'user:projects:write'
      },
      {
        title: 'Taxes Read',
        description: 'Read tax configurations',
        scope: 'user:taxes:read'
      },
      {
        title: 'Taxes Write',
        description: 'Create and update tax configurations',
        scope: 'user:taxes:write'
      },
      {
        title: 'Billable Items Read',
        description: 'Read billable items and services',
        scope: 'user:billable_items:read'
      },
      {
        title: 'Billable Items Write',
        description: 'Create and update billable items and services',
        scope: 'user:billable_items:write'
      },
      { title: 'Bills Read', description: 'Read bills', scope: 'user:bills:read' },
      {
        title: 'Bills Write',
        description: 'Create and update bills',
        scope: 'user:bills:write'
      },
      {
        title: 'Bill Vendors Read',
        description: 'Read bill vendors',
        scope: 'user:bill_vendors:read'
      },
      {
        title: 'Bill Vendors Write',
        description: 'Create and update bill vendors',
        scope: 'user:bill_vendors:write'
      },
      {
        title: 'Bill Payments Read',
        description: 'Read bill payments',
        scope: 'user:bill_payments:read'
      },
      {
        title: 'Bill Payments Write',
        description: 'Create and update bill payments',
        scope: 'user:bill_payments:write'
      },
      {
        title: 'Credit Notes Read',
        description: 'Read credit notes',
        scope: 'user:credit_notes:read'
      },
      {
        title: 'Credit Notes Write',
        description: 'Create and update credit notes',
        scope: 'user:credit_notes:write'
      },
      {
        title: 'Reports Read',
        description: 'Read financial reports',
        scope: 'user:reports:read'
      },
      { title: 'Teams Read', description: 'Read team members', scope: 'user:teams:read' },
      { title: 'Teams Write', description: 'Manage team members', scope: 'user:teams:write' },
      {
        title: 'Business Read',
        description: 'Read business information',
        scope: 'user:business:read'
      },
      {
        title: 'Journal Entries Read',
        description: 'Read journal entries',
        scope: 'user:journal_entries:read'
      },
      {
        title: 'Journal Entries Write',
        description: 'Create and update journal entries',
        scope: 'user:journal_entries:write'
      },
      {
        title: 'Other Income Read',
        description: 'Read other income records',
        scope: 'user:other_income:read'
      },
      {
        title: 'Other Income Write',
        description: 'Create and update other income records',
        scope: 'user:other_income:write'
      },
      {
        title: 'Notifications Read',
        description: 'Read notifications',
        scope: 'user:notifications:read'
      },
      {
        title: 'Online Payments Read',
        description: 'Read online payment settings',
        scope: 'user:online_payments:read'
      },
      {
        title: 'Online Payments Write',
        description: 'Manage online payment settings',
        scope: 'user:online_payments:write'
      },
      { title: 'Retainers Read', description: 'Read retainers', scope: 'user:retainers:read' },
      {
        title: 'Retainers Write',
        description: 'Create and update retainers',
        scope: 'user:retainers:write'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let scopeString = ctx.scopes.join(' ');
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: scopeString
      });

      return {
        url: `https://auth.freshbooks.com/oauth/authorize/?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let http = createAxios({
        baseURL: 'https://api.freshbooks.com'
      });

      let response = await http.post('/auth/oauth/token', {
        grant_type: 'authorization_code',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        redirect_uri: ctx.redirectUri
      });

      let data = response.data;

      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

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
        baseURL: 'https://api.freshbooks.com'
      });

      let response = await http.post('/auth/oauth/token', {
        grant_type: 'refresh_token',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        refresh_token: ctx.output.refreshToken,
        redirect_uri: ''
      });

      let data = response.data;

      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: any) => {
      let http = createAxios({
        baseURL: 'https://api.freshbooks.com',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'Api-Version': 'alpha',
          'Content-Type': 'application/json'
        }
      });

      let response = await http.get('/auth/api/v1/users/me');
      let user = response.data.response;

      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: [user.first_name, user.last_name].filter(Boolean).join(' ')
        }
      };
    }
  });
