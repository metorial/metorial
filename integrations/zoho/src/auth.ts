import { axios, SlateAuth } from 'slates';
import { z } from 'zod';
import { zohoApiError, zohoServiceError } from './lib/errors';
import type { Datacenter } from './lib/urls';
import { datacenterFromApiDomain, datacenterFromLocation, getAccountsUrl } from './lib/urls';

let scopes = [
  // CRM scopes
  {
    title: 'CRM - Full Access',
    description: 'Full access to all CRM modules',
    scope: 'ZohoCRM.modules.ALL'
  },
  {
    title: 'CRM - Read Records',
    description: 'Read access to CRM records',
    scope: 'ZohoCRM.modules.READ'
  },
  {
    title: 'CRM - Settings',
    description: 'Access CRM settings including modules metadata',
    scope: 'ZohoCRM.settings.ALL'
  },
  {
    title: 'CRM - Notifications',
    description: 'Manage CRM notification/watch subscriptions',
    scope: 'ZohoCRM.notifications.ALL'
  },
  {
    title: 'CRM - COQL',
    description: 'Execute COQL queries against CRM data',
    scope: 'ZohoCRM.coql.READ'
  },
  {
    title: 'CRM - Secure Search',
    description: 'Search CRM records using the current secure search scope',
    scope: 'ZohoSearch.securesearch.READ'
  },
  { title: 'CRM - Bulk Read', description: 'Bulk read CRM data', scope: 'ZohoCRM.bulk.READ' },
  {
    title: 'CRM - Users',
    description: 'Access CRM user information',
    scope: 'ZohoCRM.users.READ'
  },

  // Desk scopes
  {
    title: 'Desk - Tickets',
    description: 'Full access to support tickets',
    scope: 'Desk.tickets.ALL'
  },
  {
    title: 'Desk - Read Tickets',
    description: 'Read access to support tickets',
    scope: 'Desk.tickets.READ'
  },
  {
    title: 'Desk - Contacts',
    description: 'Full access to Desk contacts',
    scope: 'Desk.contacts.ALL'
  },
  {
    title: 'Desk - Settings',
    description: 'Access Desk settings and departments',
    scope: 'Desk.settings.ALL'
  },
  {
    title: 'Desk - Events',
    description: 'Manage Desk webhook subscriptions',
    scope: 'Desk.events.ALL'
  },
  {
    title: 'Desk - Search',
    description: 'Search across Desk resources',
    scope: 'Desk.search.READ'
  },
  { title: 'Desk - Basic', description: 'Basic Desk access', scope: 'Desk.basic.ALL' },

  // Books scopes
  {
    title: 'Books - Full Access',
    description: 'Full access to Zoho Books',
    scope: 'ZohoBooks.fullaccess.all'
  },
  {
    title: 'Books - Invoices',
    description: 'Manage invoices in Zoho Books',
    scope: 'ZohoBooks.invoices.ALL'
  },
  {
    title: 'Books - Read Invoices',
    description: 'Read invoices in Zoho Books',
    scope: 'ZohoBooks.invoices.READ'
  },
  {
    title: 'Books - Contacts',
    description: 'Manage contacts in Zoho Books',
    scope: 'ZohoBooks.contacts.ALL'
  },
  {
    title: 'Books - Expenses',
    description: 'Manage expenses in Zoho Books',
    scope: 'ZohoBooks.expenses.ALL'
  },
  {
    title: 'Books - Settings',
    description: 'Access Zoho Books settings and organizations',
    scope: 'ZohoBooks.settings.READ'
  },

  // People scopes
  {
    title: 'People - Full Access',
    description: 'Full access to Zoho People data',
    scope: 'ZOHOPEOPLE.forms.ALL'
  },
  {
    title: 'People - Read',
    description: 'Read access to Zoho People data',
    scope: 'ZOHOPEOPLE.forms.READ'
  },
  {
    title: 'People - Attendance',
    description: 'Manage attendance records',
    scope: 'ZOHOPEOPLE.attendance.ALL'
  },
  {
    title: 'People - Leave',
    description: 'Manage leave records',
    scope: 'ZOHOPEOPLE.leave.ALL'
  },
  {
    title: 'People - Timesheet',
    description: 'Manage timesheets',
    scope: 'ZOHOPEOPLE.timetracker.ALL'
  },

  // Projects scopes
  {
    title: 'Projects - Full Access',
    description: 'Full access to Zoho Projects',
    scope: 'ZohoProjects.portals.ALL'
  },
  {
    title: 'Projects - Manage Projects',
    description: 'Create, read, update, and delete Zoho Projects projects',
    scope: 'ZohoProjects.projects.ALL'
  },
  {
    title: 'Projects - Read',
    description: 'Read access to Zoho Projects',
    scope: 'ZohoProjects.portals.READ'
  },
  {
    title: 'Projects - Tasks',
    description: 'Manage tasks in Zoho Projects',
    scope: 'ZohoProjects.tasks.ALL'
  },
  {
    title: 'Projects - Timesheets',
    description: 'Manage project timesheets',
    scope: 'ZohoProjects.timesheets.ALL'
  },
  {
    title: 'Projects - Bugs',
    description: 'Manage bugs in Zoho Projects',
    scope: 'ZohoProjects.bugs.ALL'
  },

  // Profile scope
  {
    title: 'Profile',
    description: 'Access user profile information',
    scope: 'AaaServer.profile.READ'
  }
];

function createZohoOauth(name: string, key: string, dc: Datacenter) {
  return {
    type: 'auth.oauth' as const,
    name,
    key,
    scopes,

    getAuthorizationUrl: async (ctx: any) => {
      let accountsUrl = getAccountsUrl(dc);
      let scopeString = ctx.scopes.join(',');

      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        scope: scopeString,
        access_type: 'offline',
        state: ctx.state,
        prompt: 'consent'
      });

      return {
        url: `${accountsUrl}/oauth/v2/auth?${params.toString()}`
      };
    },

    handleCallback: async (ctx: any) => {
      let accountsUrl = getAccountsUrl(dc);

      let response: any;
      try {
        response = await axios.post(`${accountsUrl}/oauth/v2/token`, null, {
          params: {
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            grant_type: 'authorization_code',
            code: ctx.code,
            redirect_uri: ctx.redirectUri
          }
        });
      } catch (error) {
        throw zohoApiError(error, 'OAuth token exchange');
      }

      let data = response.data;

      // Prefer the location returned by Zoho -- user may have picked a different DC for login.
      let resolvedDc: Datacenter = data.location
        ? datacenterFromLocation(data.location)
        : (datacenterFromApiDomain(data.api_domain) ?? dc);

      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      if (!data.access_token) {
        throw zohoServiceError('Zoho OAuth token response did not include an access token.');
      }

      if (!data.refresh_token) {
        throw zohoServiceError(
          'Zoho OAuth token response did not include a refresh token. Reconnect and approve offline access.'
        );
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          datacenter: resolvedDc
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let resolvedDc = (ctx.output.datacenter || dc) as Datacenter;
      let accountsUrl = getAccountsUrl(resolvedDc);

      if (!ctx.output.refreshToken) {
        throw zohoServiceError(
          'Zoho OAuth profile is missing a refresh token. Reconnect the Zoho account to restore automatic refresh.'
        );
      }

      let response: any;
      try {
        response = await axios.post(`${accountsUrl}/oauth/v2/token`, null, {
          params: {
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            grant_type: 'refresh_token',
            refresh_token: ctx.output.refreshToken
          }
        });
      } catch (error) {
        throw zohoApiError(error, 'OAuth token refresh');
      }

      let data = response.data;

      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      if (!data.access_token) {
        throw zohoServiceError('Zoho OAuth refresh response did not include an access token.');
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt,
          datacenter: resolvedDc
        }
      };
    },

    getProfile: async (ctx: any) => {
      let resolvedDc = (ctx.output.datacenter || dc) as Datacenter;
      let accountsUrl = getAccountsUrl(resolvedDc);

      let response: any;
      try {
        response = await axios.get(`${accountsUrl}/oauth/user/info`, {
          headers: {
            Authorization: `Zoho-oauthtoken ${ctx.output.token}`
          }
        });
      } catch (error) {
        throw zohoApiError(error, 'profile request');
      }

      let data = response.data;

      return {
        profile: {
          id: data.ZUID?.toString(),
          email: data.Email,
          name: data.Display_Name || `${data.First_Name || ''} ${data.Last_Name || ''}`.trim()
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
      datacenter: z.string()
    })
  )
  .addOauth(createZohoOauth('United States (zoho.com)', 'oauth_us', 'us'))
  .addOauth(createZohoOauth('Europe (zoho.eu)', 'oauth_eu', 'eu'))
  .addOauth(createZohoOauth('India (zoho.in)', 'oauth_in', 'in'))
  .addOauth(createZohoOauth('Australia (zoho.com.au)', 'oauth_au', 'au'))
  .addOauth(createZohoOauth('Japan (zoho.jp)', 'oauth_jp', 'jp'))
  .addOauth(createZohoOauth('Canada (zoho.ca)', 'oauth_ca', 'ca'));
