import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let scopes = [
  {
    title: 'Messages - Full Access',
    description: 'Send, read, update, and delete emails',
    scope: 'ZohoMail.messages.ALL'
  },
  {
    title: 'Messages - Read',
    description: 'Read email messages',
    scope: 'ZohoMail.messages.READ'
  },
  {
    title: 'Accounts - Full Access',
    description: 'Read and update user account settings',
    scope: 'ZohoMail.accounts.ALL'
  },
  {
    title: 'Accounts - Read',
    description: 'Read user account settings',
    scope: 'ZohoMail.accounts.READ'
  },
  {
    title: 'Folders - Full Access',
    description: 'Create, read, update, and delete email folders',
    scope: 'ZohoMail.folders.ALL'
  },
  {
    title: 'Folders - Read',
    description: 'Read email folders',
    scope: 'ZohoMail.folders.READ'
  },
  {
    title: 'Labels - Full Access',
    description: 'Create, read, update, and delete email labels',
    scope: 'ZohoMail.tags.ALL'
  },
  { title: 'Labels - Read', description: 'Read email labels', scope: 'ZohoMail.tags.READ' },
  {
    title: 'Tasks - Full Access',
    description: 'Create, read, update, and delete tasks',
    scope: 'ZohoMail.tasks.ALL'
  },
  { title: 'Tasks - Read', description: 'Read tasks', scope: 'ZohoMail.tasks.READ' },
  {
    title: 'Notes - Full Access',
    description: 'Create, read, update, and delete notes',
    scope: 'ZohoMail.notes.ALL'
  },
  { title: 'Notes - Read', description: 'Read notes', scope: 'ZohoMail.notes.READ' },
  {
    title: 'Bookmarks - Full Access',
    description: 'Create, read, update, and delete bookmarks',
    scope: 'ZohoMail.links.ALL'
  },
  { title: 'Bookmarks - Read', description: 'Read bookmarks', scope: 'ZohoMail.links.READ' },
  {
    title: 'Organization Accounts - Full Access',
    description: 'Manage organization user accounts (admin)',
    scope: 'ZohoMail.organization.accounts.ALL'
  },
  {
    title: 'Organization Accounts - Read',
    description: 'Read organization user accounts (admin)',
    scope: 'ZohoMail.organization.accounts.READ'
  },
  {
    title: 'Organization Domains - Full Access',
    description: 'Manage organization domains (admin)',
    scope: 'ZohoMail.organization.domains.ALL'
  },
  {
    title: 'Organization Groups - Full Access',
    description: 'Manage organization groups (admin)',
    scope: 'ZohoMail.organization.groups.ALL'
  },
  {
    title: 'Organization Policy - Full Access',
    description: 'Manage mail policies (admin)',
    scope: 'ZohoMail.organization.policy.ALL'
  },
  {
    title: 'Organization Spam - Full Access',
    description: 'Manage anti-spam settings (admin)',
    scope: 'ZohoMail.organization.spam.ALL'
  },
  {
    title: 'Organization Subscriptions - Read',
    description: 'Read storage and subscription details (admin)',
    scope: 'ZohoMail.organization.subscriptions.READ'
  },
  {
    title: 'Organization Audit - Read',
    description: 'Read audit logs (admin)',
    scope: 'ZohoMail.organization.audit.READ'
  },
  {
    title: 'Partner Organization - Full Access',
    description: 'Manage partner/child organizations',
    scope: 'ZohoMail.partner.organization.ALL'
  }
];

function createMailOauth(name: string, key: string, dataCenterDomain: string) {
  return {
    type: 'auth.oauth' as const,
    name,
    key,
    scopes,

    getAuthorizationUrl: async (ctx: any) => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        scope: ctx.scopes.join(','),
        access_type: 'offline',
        state: ctx.state,
        prompt: 'consent'
      });
      return {
        url: `https://accounts.${dataCenterDomain}/oauth/v2/auth?${params.toString()}`
      };
    },

    handleCallback: async (ctx: any) => {
      let accountsAxios = createAxios({ baseURL: `https://accounts.${dataCenterDomain}` });
      let response = await accountsAxios.post('/oauth/v2/token', null, {
        params: {
          code: ctx.code,
          grant_type: 'authorization_code',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri
        }
      });
      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      let accountId: string | undefined;
      try {
        let mailAxios = createAxios({
          baseURL: `https://mail.${dataCenterDomain}`,
          headers: { Authorization: `Zoho-oauthtoken ${data.access_token}` }
        });
        let accountsResponse = await mailAxios.get('/api/accounts');
        if (accountsResponse.data?.data?.[0]?.accountId) {
          accountId = String(accountsResponse.data.data[0].accountId);
        }
      } catch {
        // optional
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          accountId,
          dataCenterDomain
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let domain = ctx.output.dataCenterDomain || dataCenterDomain;
      let accountsAxios = createAxios({ baseURL: `https://accounts.${domain}` });
      let response = await accountsAxios.post('/oauth/v2/token', null, {
        params: {
          refresh_token: ctx.output.refreshToken,
          grant_type: 'refresh_token',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
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
          accountId: ctx.output.accountId,
          dataCenterDomain: domain
        }
      };
    },

    getProfile: async (ctx: any) => {
      let domain = ctx.output.dataCenterDomain || dataCenterDomain;
      let mailAxios = createAxios({
        baseURL: `https://mail.${domain}`,
        headers: { Authorization: `Zoho-oauthtoken ${ctx.output.token}` }
      });
      let response = await mailAxios.get('/api/accounts');
      let account = response.data?.data?.[0];
      return {
        profile: {
          id: account?.accountId ? String(account.accountId) : undefined,
          email: account?.emailAddress?.[0]?.mailId || account?.primaryEmailAddress,
          name: [account?.firstName, account?.lastName].filter(Boolean).join(' ') || undefined
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
      accountId: z.string().optional().describe('Primary Zoho Mail account ID'),
      dataCenterDomain: z.string()
    })
  )
  .addOauth(createMailOauth('United States (zoho.com)', 'oauth_us', 'zoho.com'))
  .addOauth(createMailOauth('Europe (zoho.eu)', 'oauth_eu', 'zoho.eu'))
  .addOauth(createMailOauth('India (zoho.in)', 'oauth_in', 'zoho.in'))
  .addOauth(createMailOauth('Australia (zoho.com.au)', 'oauth_au', 'zoho.com.au'))
  .addOauth(createMailOauth('Japan (zoho.jp)', 'oauth_jp', 'zoho.jp'))
  .addOauth(createMailOauth('China (zoho.com.cn)', 'oauth_cn', 'zoho.com.cn'));
