import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let regionToAccountsDomain: Record<string, string> = {
  us: 'accounts.zoho.com',
  eu: 'accounts.zoho.eu',
  in: 'accounts.zoho.in',
  au: 'accounts.zoho.com.au',
  cn: 'accounts.zoho.com.cn'
};

let regionToDeskDomain: Record<string, string> = {
  us: 'desk.zoho.com',
  eu: 'desk.zoho.eu',
  in: 'desk.zoho.in',
  au: 'desk.zoho.com.au',
  cn: 'desk.zoho.com.cn'
};

let scopes = [
  {
    title: 'Tickets - Full Access',
    description: 'Create, read, update, and delete tickets',
    scope: 'Desk.tickets.ALL'
  },
  { title: 'Tickets - Read', description: 'Read tickets', scope: 'Desk.tickets.READ' },
  { title: 'Tickets - Create', description: 'Create tickets', scope: 'Desk.tickets.CREATE' },
  { title: 'Tickets - Update', description: 'Update tickets', scope: 'Desk.tickets.UPDATE' },
  { title: 'Tickets - Delete', description: 'Delete tickets', scope: 'Desk.tickets.DELETE' },
  {
    title: 'Contacts - Full Access',
    description: 'Create, read, update, and delete contacts',
    scope: 'Desk.contacts.ALL'
  },
  { title: 'Contacts - Read', description: 'Read contacts', scope: 'Desk.contacts.READ' },
  {
    title: 'Contacts - Create',
    description: 'Create contacts',
    scope: 'Desk.contacts.CREATE'
  },
  {
    title: 'Contacts - Update',
    description: 'Update contacts',
    scope: 'Desk.contacts.UPDATE'
  },
  {
    title: 'Contacts - Delete',
    description: 'Delete contacts',
    scope: 'Desk.contacts.DELETE'
  },
  {
    title: 'Accounts - Full Access',
    description: 'Create, read, update, and delete company accounts',
    scope: 'Desk.accounts.ALL'
  },
  {
    title: 'Tasks - Full Access',
    description: 'Create, read, update, and delete tasks',
    scope: 'Desk.tasks.ALL'
  },
  {
    title: 'Events - Full Access',
    description: 'Manage webhooks and calendar events',
    scope: 'Desk.events.ALL'
  },
  {
    title: 'Articles - Full Access',
    description: 'Create, read, update, and delete knowledge base articles',
    scope: 'Desk.articles.ALL'
  },
  {
    title: 'Settings - Full Access',
    description: 'Manage Zoho Desk settings',
    scope: 'Desk.settings.ALL'
  },
  {
    title: 'Basic - Full Access',
    description: 'Access basic Zoho Desk data',
    scope: 'Desk.basic.ALL'
  },
  { title: 'Search - Read', description: 'Search across modules', scope: 'Desk.search.READ' }
];

function createDeskOauth(
  name: string,
  key: string,
  region: keyof typeof regionToAccountsDomain
) {
  let accountsDomain = regionToAccountsDomain[region]!;
  let deskDomain = regionToDeskDomain[region]!;

  return {
    type: 'auth.oauth' as const,
    name,
    key,
    scopes,

    getAuthorizationUrl: async (ctx: any) => {
      let scopeString = ctx.scopes.join(',');
      let url = `https://${accountsDomain}/oauth/v2/auth?scope=${encodeURIComponent(scopeString)}&client_id=${encodeURIComponent(ctx.clientId)}&response_type=code&access_type=offline&redirect_uri=${encodeURIComponent(ctx.redirectUri)}&state=${encodeURIComponent(ctx.state)}`;
      return { url };
    },

    handleCallback: async (ctx: any) => {
      let http = createAxios({ baseURL: `https://${accountsDomain}` });
      let response = await http.post('/oauth/v2/token', null, {
        params: {
          grant_type: 'authorization_code',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        }
      });
      let data = response.data;
      let expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          accountsDomain,
          deskDomain
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let domain = ctx.output.accountsDomain || accountsDomain;
      let http = createAxios({ baseURL: `https://${domain}` });
      let response = await http.post('/oauth/v2/token', null, {
        params: {
          grant_type: 'refresh_token',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.output.refreshToken
        }
      });
      let data = response.data;
      let expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
      return {
        output: {
          ...ctx.output,
          accountsDomain: ctx.output.accountsDomain || accountsDomain,
          deskDomain: ctx.output.deskDomain || deskDomain,
          token: data.access_token,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: any) => {
      let domain = ctx.output.deskDomain || deskDomain;
      let http = createAxios({
        baseURL: `https://${domain}`,
        headers: { Authorization: `Zoho-oauthtoken ${ctx.output.token}` }
      });
      let response = await http.get('/api/v1/myinfo');
      let profile = response.data;
      return {
        profile: {
          id: profile.id,
          email: profile.emailId,
          name: profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
          imageUrl: profile.photoURL
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
      accountsDomain: z.string(),
      deskDomain: z.string()
    })
  )
  .addOauth(createDeskOauth('United States (desk.zoho.com)', 'oauth_us', 'us'))
  .addOauth(createDeskOauth('Europe (desk.zoho.eu)', 'oauth_eu', 'eu'))
  .addOauth(createDeskOauth('India (desk.zoho.in)', 'oauth_in', 'in'))
  .addOauth(createDeskOauth('Australia (desk.zoho.com.au)', 'oauth_au', 'au'))
  .addOauth(createDeskOauth('China (desk.zoho.com.cn)', 'oauth_cn', 'cn'));
