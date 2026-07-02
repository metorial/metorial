import { axios, SlateAuth } from 'slates';
import { z } from 'zod';
import { getAccountsUrl, getApiDomain, type ZohoRegion } from './lib/regions';

let scopes = [
  {
    title: 'All Modules',
    description:
      'Full access to all module records (contacts, deals, companies, products, activities)',
    scope: 'ZohoBigin.modules.ALL'
  },
  {
    title: 'All Settings',
    description:
      'Access to metadata: modules, fields, layouts, related lists, custom views, tags',
    scope: 'ZohoBigin.settings.ALL'
  },
  {
    title: 'All Users',
    description: 'Manage users in the organization',
    scope: 'ZohoBigin.users.ALL'
  },
  {
    title: 'Organization',
    description: 'View and manage organization details',
    scope: 'ZohoBigin.org.ALL'
  },
  {
    title: 'Bulk Operations',
    description: 'Bulk read and write operations',
    scope: 'ZohoBigin.bulk.ALL'
  },
  {
    title: 'Notifications',
    description: 'Manage webhook notification subscriptions',
    scope: 'ZohoBigin.notifications.ALL'
  },
  {
    title: 'Read Contacts',
    description: 'Read-only access to contacts',
    scope: 'ZohoBigin.modules.contacts.READ'
  },
  {
    title: 'Write Contacts',
    description: 'Create and update contacts',
    scope: 'ZohoBigin.modules.contacts.WRITE'
  },
  {
    title: 'Read Pipelines',
    description: 'Read-only access to pipelines (deals)',
    scope: 'ZohoBigin.modules.pipelines.READ'
  },
  {
    title: 'Write Pipelines',
    description: 'Create and update pipelines (deals)',
    scope: 'ZohoBigin.modules.pipelines.WRITE'
  },
  {
    title: 'Read Companies',
    description: 'Read-only access to companies (accounts)',
    scope: 'ZohoBigin.modules.accounts.READ'
  },
  {
    title: 'Write Companies',
    description: 'Create and update companies (accounts)',
    scope: 'ZohoBigin.modules.accounts.WRITE'
  },
  {
    title: 'Read Products',
    description: 'Read-only access to products',
    scope: 'ZohoBigin.modules.products.READ'
  },
  {
    title: 'Write Products',
    description: 'Create and update products',
    scope: 'ZohoBigin.modules.products.WRITE'
  },
  {
    title: 'Read Tasks',
    description: 'Read-only access to tasks',
    scope: 'ZohoBigin.modules.tasks.READ'
  },
  {
    title: 'Write Tasks',
    description: 'Create and update tasks',
    scope: 'ZohoBigin.modules.tasks.WRITE'
  },
  {
    title: 'Read Events',
    description: 'Read-only access to events',
    scope: 'ZohoBigin.modules.events.READ'
  },
  {
    title: 'Write Events',
    description: 'Create and update events',
    scope: 'ZohoBigin.modules.events.WRITE'
  },
  {
    title: 'Read Calls',
    description: 'Read-only access to calls',
    scope: 'ZohoBigin.modules.calls.READ'
  },
  {
    title: 'Write Calls',
    description: 'Create and update calls',
    scope: 'ZohoBigin.modules.calls.WRITE'
  },
  {
    title: 'Read Notes',
    description: 'Read-only access to notes',
    scope: 'ZohoBigin.modules.notes.READ'
  },
  {
    title: 'Write Notes',
    description: 'Create, update, and delete notes',
    scope: 'ZohoBigin.modules.notes.WRITE'
  },
  {
    title: 'Tags Settings',
    description: 'Create, update, and delete tags',
    scope: 'ZohoBigin.settings.tags.ALL'
  }
];

function createBiginOauth(name: string, key: string, region: ZohoRegion) {
  return {
    type: 'auth.oauth' as const,
    name,
    key,
    scopes,

    getAuthorizationUrl: async (ctx: any) => {
      let accountsUrl = getAccountsUrl(region);
      let scopeString = ctx.scopes.join(',');
      let url = `${accountsUrl}/oauth/v2/auth?scope=${encodeURIComponent(scopeString)}&client_id=${encodeURIComponent(ctx.clientId)}&response_type=code&access_type=offline&redirect_uri=${encodeURIComponent(ctx.redirectUri)}&state=${encodeURIComponent(ctx.state)}`;
      return { url };
    },

    handleCallback: async (ctx: any) => {
      let accountsUrl = getAccountsUrl(region);
      let apiDomain = getApiDomain(region);

      let response = await axios.post(`${accountsUrl}/oauth/v2/token`, null, {
        params: {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          grant_type: 'authorization_code'
        }
      });

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          apiDomain
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let accountsUrl = getAccountsUrl(region);
      let apiDomain = getApiDomain(region);

      let response = await axios.post(`${accountsUrl}/oauth/v2/token`, null, {
        params: {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.output.refreshToken,
          grant_type: 'refresh_token'
        }
      });

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: ctx.output.refreshToken,
          expiresAt,
          apiDomain
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await axios.get(`${ctx.output.apiDomain}/bigin/v2/users`, {
        params: { type: 'CurrentUser' },
        headers: { Authorization: `Zoho-oauthtoken ${ctx.output.token}` }
      });
      let user = response.data.users?.[0];
      return {
        profile: {
          id: user?.id,
          email: user?.email,
          name: user?.full_name
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
      apiDomain: z.string()
    })
  )
  .addOauth(createBiginOauth('United States (zohoapis.com)', 'oauth_us', 'us'))
  .addOauth(createBiginOauth('Europe (zohoapis.eu)', 'oauth_eu', 'eu'))
  .addOauth(createBiginOauth('India (zohoapis.in)', 'oauth_in', 'in'))
  .addOauth(createBiginOauth('Australia (zohoapis.com.au)', 'oauth_au', 'au'))
  .addOauth(createBiginOauth('Japan (zohoapis.jp)', 'oauth_jp', 'jp'))
  .addOauth(createBiginOauth('Canada (zohoapis.ca)', 'oauth_ca', 'ca'))
  .addOauth(createBiginOauth('Saudi Arabia (zohoapis.sa)', 'oauth_sa', 'sa'))
  .addOauth(createBiginOauth('China (zohoapis.com.cn)', 'oauth_cn', 'cn'));
