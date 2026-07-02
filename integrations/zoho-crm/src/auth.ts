import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { zohoCrmApiError, zohoCrmServiceError } from './lib/errors';

let accountsBaseUrls: Record<string, string> = {
  us: 'https://accounts.zoho.com',
  eu: 'https://accounts.zoho.eu',
  in: 'https://accounts.zoho.in',
  au: 'https://accounts.zoho.com.au',
  jp: 'https://accounts.zoho.jp',
  ca: 'https://accounts.zoho.ca',
  sa: 'https://accounts.zoho.sa',
  cn: 'https://accounts.zoho.com.cn'
};

let apiBaseUrls: Record<string, string> = {
  us: 'https://www.zohoapis.com',
  eu: 'https://www.zohoapis.eu',
  in: 'https://www.zohoapis.in',
  au: 'https://www.zohoapis.com.au',
  jp: 'https://www.zohoapis.jp',
  ca: 'https://www.zohoapis.ca',
  sa: 'https://www.zohoapis.sa',
  cn: 'https://www.zohoapis.com.cn'
};

let scopes = [
  {
    title: 'All Modules - Full Access',
    description: 'Read, create, update, and delete records in all CRM modules',
    scope: 'ZohoCRM.modules.ALL'
  },
  {
    title: 'Leads - Full Access',
    description: 'Full access to Leads module',
    scope: 'ZohoCRM.modules.leads.ALL'
  },
  {
    title: 'Leads - Read',
    description: 'Read-only access to Leads',
    scope: 'ZohoCRM.modules.leads.READ'
  },
  {
    title: 'Contacts - Full Access',
    description: 'Full access to Contacts module',
    scope: 'ZohoCRM.modules.contacts.ALL'
  },
  {
    title: 'Contacts - Read',
    description: 'Read-only access to Contacts',
    scope: 'ZohoCRM.modules.contacts.READ'
  },
  {
    title: 'Accounts - Full Access',
    description: 'Full access to Accounts module',
    scope: 'ZohoCRM.modules.accounts.ALL'
  },
  {
    title: 'Accounts - Read',
    description: 'Read-only access to Accounts',
    scope: 'ZohoCRM.modules.accounts.READ'
  },
  {
    title: 'Deals - Full Access',
    description: 'Full access to Deals module',
    scope: 'ZohoCRM.modules.deals.ALL'
  },
  {
    title: 'Deals - Read',
    description: 'Read-only access to Deals',
    scope: 'ZohoCRM.modules.deals.READ'
  },
  {
    title: 'Tasks - Full Access',
    description: 'Full access to Tasks module',
    scope: 'ZohoCRM.modules.tasks.ALL'
  },
  {
    title: 'Events - Full Access',
    description: 'Full access to Events module',
    scope: 'ZohoCRM.modules.events.ALL'
  },
  {
    title: 'Calls - Full Access',
    description: 'Full access to Calls module',
    scope: 'ZohoCRM.modules.calls.ALL'
  },
  {
    title: 'Products - Full Access',
    description: 'Full access to Products module',
    scope: 'ZohoCRM.modules.products.ALL'
  },
  {
    title: 'Campaigns - Full Access',
    description: 'Full access to Campaigns module',
    scope: 'ZohoCRM.modules.campaigns.ALL'
  },
  {
    title: 'Settings - Full Access',
    description: 'Full access to CRM settings (fields, layouts, roles, etc.)',
    scope: 'ZohoCRM.settings.ALL'
  },
  {
    title: 'Settings - Read',
    description: 'Read-only access to CRM settings',
    scope: 'ZohoCRM.settings.READ'
  },
  {
    title: 'Custom Views - Read',
    description: 'Read CRM custom view metadata',
    scope: 'ZohoCRM.settings.custom_views.READ'
  },
  {
    title: 'Related Lists - Read',
    description: 'Read CRM related list metadata',
    scope: 'ZohoCRM.settings.related_lists.READ'
  },
  {
    title: 'Tags - Read',
    description: 'Read CRM tag metadata',
    scope: 'ZohoCRM.settings.tags.READ'
  },
  {
    title: 'Notifications - Full Access',
    description: 'Subscribe to and manage record change notifications',
    scope: 'ZohoCRM.notifications.ALL'
  },
  {
    title: 'Notifications - Read',
    description: 'Read notification subscriptions',
    scope: 'ZohoCRM.notifications.READ'
  },
  {
    title: 'Users - Full Access',
    description: 'Full access to user management',
    scope: 'ZohoCRM.users.ALL'
  },
  {
    title: 'Users - Read',
    description: 'Read-only access to users',
    scope: 'ZohoCRM.users.READ'
  },
  {
    title: 'Organization - Full Access',
    description: 'Full access to organization settings',
    scope: 'ZohoCRM.org.ALL'
  },
  {
    title: 'Organization - Read',
    description: 'Read-only access to organization',
    scope: 'ZohoCRM.org.READ'
  },
  {
    title: 'Bulk Operations - Read',
    description: 'Read bulk operations',
    scope: 'ZohoCRM.bulk.READ'
  },
  {
    title: 'Bulk Operations - Full Access',
    description: 'Full access to bulk operations',
    scope: 'ZohoCRM.bulk.ALL'
  },
  {
    title: 'COQL - Read',
    description: 'Execute COQL queries for advanced data retrieval',
    scope: 'ZohoCRM.coql.READ'
  },
  {
    title: 'Secure Search - Read',
    description: 'Search records through Zoho CRM secure search',
    scope: 'ZohoSearch.securesearch.READ'
  },
  {
    title: 'Notes - Full Access',
    description: 'Read, create, update, and delete CRM notes',
    scope: 'ZohoCRM.modules.notes.ALL'
  },
  {
    title: 'Attachments - Full Access',
    description: 'Read, upload, download, and delete CRM record attachments',
    scope: 'ZohoCRM.modules.attachments.ALL'
  },
  {
    title: 'Files - Full Access',
    description: 'Upload and download files',
    scope: 'ZohoCRM.files.ALL'
  },
  {
    title: 'Send Email',
    description: 'Send emails from CRM',
    scope: 'ZohoCRM.send_mail.all.CREATE'
  }
];

function createCrmOauth(name: string, key: string, dc: keyof typeof accountsBaseUrls) {
  let accountsUrl = accountsBaseUrls[dc]!;
  let apiUrl = apiBaseUrls[dc]!;

  return {
    type: 'auth.oauth' as const,
    name,
    key,
    scopes,

    getAuthorizationUrl: async (ctx: any) => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        access_type: 'offline',
        scope: ctx.scopes.join(','),
        state: ctx.state,
        prompt: 'consent'
      });
      return { url: `${accountsUrl}/oauth/v2/auth?${params.toString()}` };
    },

    handleCallback: async (ctx: any) => {
      try {
        let http = createAxios({ baseURL: accountsUrl });
        let response = await http.post(
          '/oauth/v2/token',
          new URLSearchParams({
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            code: ctx.code,
            redirect_uri: ctx.redirectUri,
            grant_type: 'authorization_code'
          }).toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        let data = response.data as Record<string, any>;
        if (!data.access_token) {
          throw zohoCrmServiceError('Zoho CRM OAuth callback did not return an access token.');
        }
        let expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
        return {
          output: {
            token: String(data.access_token),
            refreshToken: data.refresh_token ? String(data.refresh_token) : undefined,
            expiresAt,
            apiBaseUrl: apiUrl,
            accountsBaseUrl: accountsUrl
          }
        };
      } catch (error) {
        throw zohoCrmApiError(error, 'OAuth callback');
      }
    },

    handleTokenRefresh: async (ctx: any) => {
      try {
        if (!ctx.output.refreshToken) {
          throw zohoCrmServiceError(
            'Zoho CRM OAuth refresh token is missing. Reconnect the account with offline access.'
          );
        }

        let http = createAxios({ baseURL: ctx.output.accountsBaseUrl || accountsUrl });
        let response = await http.post(
          '/oauth/v2/token',
          new URLSearchParams({
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            refresh_token: ctx.output.refreshToken,
            grant_type: 'refresh_token'
          }).toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        let data = response.data as Record<string, any>;
        if (!data.access_token) {
          throw zohoCrmServiceError('Zoho CRM token refresh did not return an access token.');
        }
        let expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
        return {
          output: {
            token: String(data.access_token),
            refreshToken: ctx.output.refreshToken,
            expiresAt,
            apiBaseUrl: ctx.output.apiBaseUrl || apiUrl,
            accountsBaseUrl: ctx.output.accountsBaseUrl || accountsUrl
          }
        };
      } catch (error) {
        throw zohoCrmApiError(error, 'OAuth token refresh');
      }
    },

    getProfile: async (ctx: any) => {
      try {
        let http = createAxios({ baseURL: ctx.output.apiBaseUrl || apiUrl });
        let response = await http.get('/crm/v8/users?type=CurrentUser', {
          headers: { Authorization: `Zoho-oauthtoken ${ctx.output.token}` }
        });
        let user = response.data?.users?.[0];
        return {
          profile: {
            id: user?.id,
            email: user?.email,
            name:
              user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
            imageUrl: user?.image_link,
            role: user?.role?.name,
            profileName: user?.profile?.name
          }
        };
      } catch (error) {
        throw zohoCrmApiError(error, 'get profile');
      }
    }
  };
}

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      apiBaseUrl: z.string(),
      accountsBaseUrl: z.string()
    })
  )
  .addOauth(createCrmOauth('United States (zohoapis.com)', 'oauth_us', 'us'))
  .addOauth(createCrmOauth('Europe (zohoapis.eu)', 'oauth_eu', 'eu'))
  .addOauth(createCrmOauth('India (zohoapis.in)', 'oauth_in', 'in'))
  .addOauth(createCrmOauth('Australia (zohoapis.com.au)', 'oauth_au', 'au'))
  .addOauth(createCrmOauth('Japan (zohoapis.jp)', 'oauth_jp', 'jp'))
  .addOauth(createCrmOauth('Canada (zohoapis.ca)', 'oauth_ca', 'ca'))
  .addOauth(createCrmOauth('Saudi Arabia (zohoapis.sa)', 'oauth_sa', 'sa'))
  .addOauth(createCrmOauth('China (zohoapis.com.cn)', 'oauth_cn', 'cn'));
