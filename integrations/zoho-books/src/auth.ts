import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let scopes = [
  {
    title: 'Full Access',
    description: 'Full access to all Zoho Books resources',
    scope: 'ZohoBooks.fullaccess.all'
  },
  {
    title: 'Contacts',
    description: 'Read and manage customers and vendors',
    scope: 'ZohoBooks.contacts.ALL'
  },
  {
    title: 'Contacts (Read)',
    description: 'Read-only access to customers and vendors',
    scope: 'ZohoBooks.contacts.READ'
  },
  {
    title: 'Settings',
    description: 'Read and manage items, taxes, currencies, users, and other settings',
    scope: 'ZohoBooks.settings.ALL'
  },
  {
    title: 'Settings (Read)',
    description: 'Read-only access to items, taxes, currencies, users, and other settings',
    scope: 'ZohoBooks.settings.READ'
  },
  {
    title: 'Invoices',
    description: 'Read and manage invoices',
    scope: 'ZohoBooks.invoices.ALL'
  },
  {
    title: 'Invoices (Read)',
    description: 'Read-only access to invoices',
    scope: 'ZohoBooks.invoices.READ'
  },
  {
    title: 'Estimates',
    description: 'Read and manage estimates/quotes',
    scope: 'ZohoBooks.estimates.ALL'
  },
  {
    title: 'Estimates (Read)',
    description: 'Read-only access to estimates/quotes',
    scope: 'ZohoBooks.estimates.READ'
  },
  {
    title: 'Customer Payments',
    description: 'Read and manage payments received',
    scope: 'ZohoBooks.customerpayments.ALL'
  },
  {
    title: 'Customer Payments (Read)',
    description: 'Read-only access to payments received',
    scope: 'ZohoBooks.customerpayments.READ'
  },
  {
    title: 'Credit Notes',
    description: 'Read and manage credit notes',
    scope: 'ZohoBooks.creditnotes.ALL'
  },
  {
    title: 'Credit Notes (Read)',
    description: 'Read-only access to credit notes',
    scope: 'ZohoBooks.creditnotes.READ'
  },
  {
    title: 'Projects',
    description: 'Read and manage projects and time tracking',
    scope: 'ZohoBooks.projects.ALL'
  },
  {
    title: 'Projects (Read)',
    description: 'Read-only access to projects and time tracking',
    scope: 'ZohoBooks.projects.READ'
  },
  {
    title: 'Expenses',
    description: 'Read and manage expenses',
    scope: 'ZohoBooks.expenses.ALL'
  },
  {
    title: 'Expenses (Read)',
    description: 'Read-only access to expenses',
    scope: 'ZohoBooks.expenses.READ'
  },
  {
    title: 'Sales Orders',
    description: 'Read and manage sales orders',
    scope: 'ZohoBooks.salesorders.ALL'
  },
  {
    title: 'Sales Orders (Read)',
    description: 'Read-only access to sales orders',
    scope: 'ZohoBooks.salesorders.READ'
  },
  {
    title: 'Purchase Orders',
    description: 'Read and manage purchase orders',
    scope: 'ZohoBooks.purchaseorders.ALL'
  },
  {
    title: 'Purchase Orders (Read)',
    description: 'Read-only access to purchase orders',
    scope: 'ZohoBooks.purchaseorders.READ'
  },
  { title: 'Bills', description: 'Read and manage bills', scope: 'ZohoBooks.bills.ALL' },
  {
    title: 'Bills (Read)',
    description: 'Read-only access to bills',
    scope: 'ZohoBooks.bills.READ'
  },
  {
    title: 'Debit Notes',
    description: 'Read and manage vendor credits',
    scope: 'ZohoBooks.debitnotes.ALL'
  },
  {
    title: 'Debit Notes (Read)',
    description: 'Read-only access to vendor credits',
    scope: 'ZohoBooks.debitnotes.READ'
  },
  {
    title: 'Vendor Payments',
    description: 'Read and manage payments made',
    scope: 'ZohoBooks.vendorpayments.ALL'
  },
  {
    title: 'Vendor Payments (Read)',
    description: 'Read-only access to payments made',
    scope: 'ZohoBooks.vendorpayments.READ'
  },
  {
    title: 'Banking',
    description: 'Read and manage banking transactions',
    scope: 'ZohoBooks.banking.ALL'
  },
  {
    title: 'Banking (Read)',
    description: 'Read-only access to banking transactions',
    scope: 'ZohoBooks.banking.READ'
  },
  {
    title: 'Accountants',
    description: 'Read and manage accountant module',
    scope: 'ZohoBooks.accountants.ALL'
  },
  {
    title: 'Accountants (Read)',
    description: 'Read-only access to accountant module',
    scope: 'ZohoBooks.accountants.READ'
  }
];

function createBooksOauth(name: string, key: string, regionSuffix: string) {
  let accountsUrl = `https://accounts.zoho${regionSuffix}`;

  return {
    type: 'auth.oauth' as const,
    name,
    key,
    scopes,

    getAuthorizationUrl: async (ctx: any) => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        scope: ctx.scopes.join(','),
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        access_type: 'offline',
        prompt: 'consent'
      });
      return { url: `${accountsUrl}/oauth/v2/auth?${params.toString()}` };
    },

    handleCallback: async (ctx: any) => {
      let httpClient = createAxios({ baseURL: accountsUrl });
      let response = await httpClient.post('/oauth/v2/token', null, {
        params: {
          grant_type: 'authorization_code',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri,
          code: ctx.code
        }
      });
      let data = response.data;
      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
          accountsUrl
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let httpClient = createAxios({ baseURL: ctx.output.accountsUrl || accountsUrl });
      let response = await httpClient.post('/oauth/v2/token', null, {
        params: {
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }
      });
      let data = response.data;
      return {
        output: {
          token: data.access_token,
          refreshToken: ctx.output.refreshToken,
          expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
          accountsUrl: ctx.output.accountsUrl || accountsUrl
        }
      };
    },

    getProfile: async (ctx: any) => {
      let httpClient = createAxios({ baseURL: ctx.output.accountsUrl || accountsUrl });
      let response = await httpClient.get('/oauth/user/info', {
        headers: { Authorization: `Zoho-oauthtoken ${ctx.output.token}` }
      });
      let user = response.data;
      return {
        profile: {
          id: user.ZUID?.toString(),
          email: user.Email,
          name: user.Display_Name || `${user.First_Name || ''} ${user.Last_Name || ''}`.trim()
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
      accountsUrl: z.string()
    })
  )
  .addOauth(createBooksOauth('United States (zoho.com)', 'oauth_us', '.com'))
  .addOauth(createBooksOauth('Europe (zoho.eu)', 'oauth_eu', '.eu'))
  .addOauth(createBooksOauth('India (zoho.in)', 'oauth_in', '.in'))
  .addOauth(createBooksOauth('Australia (zoho.com.au)', 'oauth_au', '.com.au'))
  .addOauth(createBooksOauth('Japan (zoho.jp)', 'oauth_jp', '.jp'))
  .addOauth(createBooksOauth('Canada (zoho.ca)', 'oauth_ca', '.ca'))
  .addOauth(createBooksOauth('Saudi Arabia (zoho.sa)', 'oauth_sa', '.sa'))
  .addOauth(createBooksOauth('China (zoho.com.cn)', 'oauth_cn', '.com.cn'));
