import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let regionToOAuthDomain = (region: string): string => {
  let map: Record<string, string> = {
    com: 'accounts.zoho.com',
    eu: 'accounts.zoho.eu',
    in: 'accounts.zoho.in',
    'com.au': 'accounts.zoho.com.au',
    jp: 'accounts.zoho.jp',
    ca: 'accounts.zohocloud.ca'
  };
  return map[region] ?? 'accounts.zoho.com';
};

let scopes = [
  {
    title: 'Full Access',
    description: 'Full access to all Zoho Invoice modules',
    scope: 'ZohoInvoice.fullaccess.all'
  },
  {
    title: 'Contacts - Create',
    description: 'Create contacts',
    scope: 'ZohoInvoice.contacts.CREATE'
  },
  {
    title: 'Contacts - Read',
    description: 'Read contacts',
    scope: 'ZohoInvoice.contacts.READ'
  },
  {
    title: 'Contacts - Update',
    description: 'Update contacts',
    scope: 'ZohoInvoice.contacts.UPDATE'
  },
  {
    title: 'Contacts - Delete',
    description: 'Delete contacts',
    scope: 'ZohoInvoice.contacts.DELETE'
  },
  {
    title: 'Invoices - Create',
    description: 'Create invoices',
    scope: 'ZohoInvoice.invoices.CREATE'
  },
  {
    title: 'Invoices - Read',
    description: 'Read invoices',
    scope: 'ZohoInvoice.invoices.READ'
  },
  {
    title: 'Invoices - Update',
    description: 'Update invoices',
    scope: 'ZohoInvoice.invoices.UPDATE'
  },
  {
    title: 'Invoices - Delete',
    description: 'Delete invoices',
    scope: 'ZohoInvoice.invoices.DELETE'
  },
  {
    title: 'Estimates - Create',
    description: 'Create estimates',
    scope: 'ZohoInvoice.estimates.CREATE'
  },
  {
    title: 'Estimates - Read',
    description: 'Read estimates',
    scope: 'ZohoInvoice.estimates.READ'
  },
  {
    title: 'Estimates - Update',
    description: 'Update estimates',
    scope: 'ZohoInvoice.estimates.UPDATE'
  },
  {
    title: 'Estimates - Delete',
    description: 'Delete estimates',
    scope: 'ZohoInvoice.estimates.DELETE'
  },
  {
    title: 'Payments - Create',
    description: 'Create customer payments',
    scope: 'ZohoInvoice.customerpayments.CREATE'
  },
  {
    title: 'Payments - Read',
    description: 'Read customer payments',
    scope: 'ZohoInvoice.customerpayments.READ'
  },
  {
    title: 'Payments - Update',
    description: 'Update customer payments',
    scope: 'ZohoInvoice.customerpayments.UPDATE'
  },
  {
    title: 'Payments - Delete',
    description: 'Delete customer payments',
    scope: 'ZohoInvoice.customerpayments.DELETE'
  },
  {
    title: 'Credit Notes - Create',
    description: 'Create credit notes',
    scope: 'ZohoInvoice.creditnotes.CREATE'
  },
  {
    title: 'Credit Notes - Read',
    description: 'Read credit notes',
    scope: 'ZohoInvoice.creditnotes.READ'
  },
  {
    title: 'Credit Notes - Update',
    description: 'Update credit notes',
    scope: 'ZohoInvoice.creditnotes.UPDATE'
  },
  {
    title: 'Credit Notes - Delete',
    description: 'Delete credit notes',
    scope: 'ZohoInvoice.creditnotes.DELETE'
  },
  {
    title: 'Expenses - Create',
    description: 'Create expenses',
    scope: 'ZohoInvoice.expenses.CREATE'
  },
  {
    title: 'Expenses - Read',
    description: 'Read expenses',
    scope: 'ZohoInvoice.expenses.READ'
  },
  {
    title: 'Expenses - Update',
    description: 'Update expenses',
    scope: 'ZohoInvoice.expenses.UPDATE'
  },
  {
    title: 'Expenses - Delete',
    description: 'Delete expenses',
    scope: 'ZohoInvoice.expenses.DELETE'
  },
  {
    title: 'Projects - Create',
    description: 'Create projects',
    scope: 'ZohoInvoice.projects.CREATE'
  },
  {
    title: 'Projects - Read',
    description: 'Read projects',
    scope: 'ZohoInvoice.projects.READ'
  },
  {
    title: 'Projects - Update',
    description: 'Update projects',
    scope: 'ZohoInvoice.projects.UPDATE'
  },
  {
    title: 'Projects - Delete',
    description: 'Delete projects',
    scope: 'ZohoInvoice.projects.DELETE'
  },
  {
    title: 'Settings - Create',
    description: 'Create settings (items, taxes, currencies)',
    scope: 'ZohoInvoice.settings.CREATE'
  },
  {
    title: 'Settings - Read',
    description: 'Read settings (items, taxes, currencies)',
    scope: 'ZohoInvoice.settings.READ'
  },
  {
    title: 'Settings - Update',
    description: 'Update settings (items, taxes, currencies)',
    scope: 'ZohoInvoice.settings.UPDATE'
  },
  {
    title: 'Settings - Delete',
    description: 'Delete settings (items, taxes, currencies)',
    scope: 'ZohoInvoice.settings.DELETE'
  }
];

function createInvoiceOauth(name: string, key: string, region: string) {
  let oauthDomain = regionToOAuthDomain(region);

  return {
    type: 'auth.oauth' as const,
    name,
    key,
    scopes,

    getAuthorizationUrl: async (ctx: any) => {
      let scopeStr = ctx.scopes.join(',');
      let params = new URLSearchParams({
        scope: scopeStr,
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        access_type: 'offline',
        prompt: 'Consent'
      });
      return { url: `https://${oauthDomain}/oauth/v2/auth?${params.toString()}` };
    },

    handleCallback: async (ctx: any) => {
      let http = createAxios({ baseURL: `https://${oauthDomain}` });
      let response = await http.post(
        '/oauth/v2/token',
        new URLSearchParams({
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri,
          grant_type: 'authorization_code'
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;
      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          region
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let http = createAxios({ baseURL: `https://${oauthDomain}` });
      let response = await http.post(
        '/oauth/v2/token',
        new URLSearchParams({
          refresh_token: ctx.output.refreshToken ?? '',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token'
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;
      return {
        output: {
          token: data.access_token,
          refreshToken: ctx.output.refreshToken,
          expiresAt,
          region: ctx.output.region || region
        }
      };
    }
  };
}

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      region: z.string()
    })
  )
  .addOauth(createInvoiceOauth('United States (zoho.com)', 'oauth_com', 'com'))
  .addOauth(createInvoiceOauth('Europe (zoho.eu)', 'oauth_eu', 'eu'))
  .addOauth(createInvoiceOauth('India (zoho.in)', 'oauth_in', 'in'))
  .addOauth(createInvoiceOauth('Australia (zoho.com.au)', 'oauth_au', 'com.au'))
  .addOauth(createInvoiceOauth('Japan (zoho.jp)', 'oauth_jp', 'jp'))
  .addOauth(createInvoiceOauth('Canada (zohocloud.ca)', 'oauth_ca', 'ca'));
