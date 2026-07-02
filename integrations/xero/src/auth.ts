import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { xeroApiError, xeroServiceError } from './lib/errors';

let LEGACY_CUSTOM_CONNECTION_SCOPES = [
  'accounting.transactions',
  'accounting.contacts',
  'accounting.settings',
  'accounting.reports.read',
  'accounting.attachments'
].join(' ');

let GRANULAR_CUSTOM_CONNECTION_SCOPES = [
  'accounting.invoices',
  'accounting.payments',
  'accounting.banktransactions',
  'accounting.manualjournals',
  'accounting.contacts',
  'accounting.settings',
  'accounting.attachments',
  'accounting.reports.aged.read',
  'accounting.reports.balancesheet.read',
  'accounting.reports.banksummary.read',
  'accounting.reports.executivesummary.read',
  'accounting.reports.profitandloss.read',
  'accounting.reports.trialbalance.read',
  'accounting.reports.taxreports.read'
].join(' ');

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      tenantId: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'Xero OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developer.xero.com/documentation/guides/oauth2/auth-flow/'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developer.xero.com/documentation/guides/oauth2/scopes/'
      }
    ],

    scopes: [
      // OpenID Connect
      { title: 'OpenID', description: 'Access to OpenID identity', scope: 'openid' },
      {
        title: 'Profile',
        description: 'Access to user profile information',
        scope: 'profile'
      },
      { title: 'Email', description: 'Access to user email address', scope: 'email' },

      // Offline access
      {
        title: 'Offline Access',
        description: 'Maintain connection and refresh tokens automatically',
        scope: 'offline_access'
      },

      // Accounting - Transactions
      {
        title: 'Invoices',
        description:
          'Read and write access to invoices, credit notes, purchase orders, quotes, repeating invoices, and items',
        scope: 'accounting.invoices'
      },
      {
        title: 'Invoices (Read)',
        description:
          'Read-only access to invoices, credit notes, purchase orders, quotes, repeating invoices, and items',
        scope: 'accounting.invoices.read',
        defaultChecked: false
      },
      {
        title: 'Payments',
        description:
          'Read and write access to payments, batch payments, prepayments, and overpayments',
        scope: 'accounting.payments'
      },
      {
        title: 'Payments (Read)',
        description:
          'Read-only access to payments, batch payments, prepayments, and overpayments',
        scope: 'accounting.payments.read',
        defaultChecked: false
      },
      {
        title: 'Bank Transactions',
        description: 'Read and write access to bank transactions and bank transfers',
        scope: 'accounting.banktransactions'
      },
      {
        title: 'Bank Transactions (Read)',
        description: 'Read-only access to bank transactions and bank transfers',
        scope: 'accounting.banktransactions.read',
        defaultChecked: false
      },
      {
        title: 'Manual Journals',
        description: 'Read and write access to manual journals',
        scope: 'accounting.manualjournals'
      },
      {
        title: 'Manual Journals (Read)',
        description: 'Read-only access to manual journals',
        scope: 'accounting.manualjournals.read',
        defaultChecked: false
      },
      {
        title: 'Transactions (Legacy)',
        description:
          'Legacy broad transaction scope for apps created before March 2, 2026. Leave unchecked for new Xero apps.',
        scope: 'accounting.transactions',
        defaultChecked: false
      },
      {
        title: 'Transactions (Legacy Read)',
        description:
          'Legacy broad transaction read scope for apps created before March 2, 2026. Leave unchecked for new Xero apps.',
        scope: 'accounting.transactions.read',
        defaultChecked: false
      },

      // Accounting - Contacts
      {
        title: 'Contacts',
        description: 'Read and write access to contacts and contact groups',
        scope: 'accounting.contacts'
      },
      {
        title: 'Contacts (Read)',
        description: 'Read-only access to contacts and contact groups',
        scope: 'accounting.contacts.read',
        defaultChecked: false
      },

      // Accounting - Settings
      {
        title: 'Settings',
        description: 'Read and write access to chart of accounts, tax rates, currencies, etc.',
        scope: 'accounting.settings'
      },
      {
        title: 'Settings (Read)',
        description: 'Read-only access to chart of accounts, tax rates, currencies, etc.',
        scope: 'accounting.settings.read',
        defaultChecked: false
      },

      // Accounting - Reports
      {
        title: 'Aged Reports (Read)',
        description: 'Read-only access to aged payables and aged receivables reports',
        scope: 'accounting.reports.aged.read'
      },
      {
        title: 'Balance Sheet Report (Read)',
        description: 'Read-only access to the Balance Sheet report',
        scope: 'accounting.reports.balancesheet.read'
      },
      {
        title: 'Bank Summary Report (Read)',
        description: 'Read-only access to the Bank Summary report',
        scope: 'accounting.reports.banksummary.read'
      },
      {
        title: 'Executive Summary Report (Read)',
        description: 'Read-only access to the Executive Summary report',
        scope: 'accounting.reports.executivesummary.read'
      },
      {
        title: 'Profit and Loss Report (Read)',
        description: 'Read-only access to the Profit and Loss report',
        scope: 'accounting.reports.profitandloss.read'
      },
      {
        title: 'Trial Balance Report (Read)',
        description: 'Read-only access to the Trial Balance report',
        scope: 'accounting.reports.trialbalance.read'
      },
      {
        title: 'Tax Reports (Read)',
        description: 'Read-only access to GST and BAS reports',
        scope: 'accounting.reports.taxreports.read'
      },
      {
        title: 'Reports (Legacy Read)',
        description:
          'Legacy broad reports scope for apps created before March 2, 2026. Leave unchecked for new Xero apps.',
        scope: 'accounting.reports.read',
        defaultChecked: false
      },

      // Accounting - Journals
      {
        title: 'System Journals (Read)',
        description:
          'Read-only access to system-generated journal entries. This is a legacy or premium-gated Xero scope, not needed for manual journals.',
        scope: 'accounting.journals.read',
        defaultChecked: false
      },

      // Accounting - Attachments
      {
        title: 'Attachments',
        description: 'Read and write access to file attachments',
        scope: 'accounting.attachments'
      },
      {
        title: 'Attachments (Read)',
        description: 'Read-only access to file attachments',
        scope: 'accounting.attachments.read',
        defaultChecked: false
      },

      // Assets
      {
        title: 'Assets',
        description: 'Read and write access to fixed assets',
        scope: 'assets',
        defaultChecked: false
      },
      {
        title: 'Assets (Read)',
        description: 'Read-only access to fixed assets',
        scope: 'assets.read',
        defaultChecked: false
      },

      // Projects
      {
        title: 'Projects',
        description: 'Read and write access to projects and time tracking',
        scope: 'projects',
        defaultChecked: false
      },
      {
        title: 'Projects (Read)',
        description: 'Read-only access to projects and time tracking',
        scope: 'projects.read',
        defaultChecked: false
      },

      // Files
      {
        title: 'Files',
        description: 'Read and write access to Xero Files',
        scope: 'files',
        defaultChecked: false
      },
      {
        title: 'Files (Read)',
        description: 'Read-only access to Xero Files',
        scope: 'files.read',
        defaultChecked: false
      },

      // Bank Feeds
      {
        title: 'Bank Feeds',
        description:
          'Access to the restricted Bank Feeds API for pushing statement data. Requires Xero financial-services partner access.',
        scope: 'bankfeeds',
        defaultChecked: false
      },

      // Payroll
      {
        title: 'Payroll AU',
        description: 'Access to Australian payroll',
        scope: 'payroll.au',
        defaultChecked: false
      },
      {
        title: 'Payroll UK',
        description: 'Access to UK payroll',
        scope: 'payroll.uk',
        defaultChecked: false
      },
      {
        title: 'Payroll NZ',
        description: 'Access to New Zealand payroll',
        scope: 'payroll.nz',
        defaultChecked: false
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        scope: ctx.scopes.join(' '),
        state: ctx.state
      });

      return {
        url: `https://login.xero.com/identity/connect/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let tokenClient = createAxios({ baseURL: 'https://identity.xero.com' });

      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let tokenResponse: any;
      try {
        tokenResponse = await tokenClient.post(
          '/connect/token',
          new URLSearchParams({
            grant_type: 'authorization_code',
            code: ctx.code,
            redirect_uri: ctx.redirectUri
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Basic ${credentials}`
            }
          }
        );
      } catch (error) {
        throw xeroApiError(error, 'OAuth token exchange');
      }

      let tokenData = tokenResponse.data as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type?: string;
      };

      if (!tokenData.access_token) {
        throw xeroServiceError('Failed to obtain access token from Xero.');
      }

      let expiresAt: string | undefined;
      if (tokenData.expires_in) {
        expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
      }

      // Fetch tenant ID from connections endpoint
      let connectionsClient = createAxios({ baseURL: 'https://api.xero.com' });
      let connectionsResponse: any;
      try {
        connectionsResponse = await connectionsClient.get('/connections', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        throw xeroApiError(error, 'connections lookup');
      }

      let connections = connectionsResponse.data as Array<{
        id: string;
        tenantId: string;
        tenantName: string;
        tenantType: string;
      }>;

      let tenantId = connections.length > 0 ? connections[0]?.tenantId : undefined;

      return {
        output: {
          token: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt,
          tenantId
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw xeroServiceError('No refresh token available. User must reauthorize.');
      }

      let tokenClient = createAxios({ baseURL: 'https://identity.xero.com' });
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let tokenResponse: any;
      try {
        tokenResponse = await tokenClient.post(
          '/connect/token',
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: ctx.output.refreshToken
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Basic ${credentials}`
            }
          }
        );
      } catch (error) {
        throw xeroApiError(error, 'OAuth token refresh');
      }

      let tokenData = tokenResponse.data as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      };

      if (!tokenData.access_token) {
        throw xeroServiceError('Failed to refresh access token.');
      }

      let expiresAt: string | undefined;
      if (tokenData.expires_in) {
        expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
      }

      // Re-fetch tenant ID to keep it current
      let connectionsClient = createAxios({ baseURL: 'https://api.xero.com' });
      let connectionsResponse: any;
      try {
        connectionsResponse = await connectionsClient.get('/connections', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        throw xeroApiError(error, 'connections lookup');
      }

      let connections = connectionsResponse.data as Array<{
        id: string;
        tenantId: string;
        tenantName: string;
        tenantType: string;
      }>;

      let tenantId =
        ctx.output.tenantId || (connections.length > 0 ? connections[0]?.tenantId : undefined);

      return {
        output: {
          token: tokenData.access_token,
          refreshToken: tokenData.refresh_token || ctx.output.refreshToken,
          expiresAt,
          tenantId
        }
      };
    },

    getProfile: async (ctx: { output: { token: string } }) => {
      // Decode the ID token from the access token to get user info
      // Xero uses OpenID Connect, so we can call the userinfo endpoint
      let client = createAxios({ baseURL: 'https://api.xero.com' });

      // Get connections to show organisation details
      let connectionsResponse: any;
      try {
        connectionsResponse = await client.get('/connections', {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        throw xeroApiError(error, 'profile connections lookup');
      }

      let connections = connectionsResponse.data as Array<{
        id: string;
        tenantId: string;
        tenantName: string;
        tenantType: string;
      }>;

      let profile: Record<string, any> = {};

      // Try to get user profile from OpenID userinfo endpoint
      try {
        let userinfoClient = createAxios({ baseURL: 'https://identity.xero.com' });
        let userinfoResponse = await userinfoClient.get('/connect/userinfo', {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`
          }
        });

        let userinfo = userinfoResponse.data as {
          sub?: string;
          email?: string;
          name?: string;
          given_name?: string;
          family_name?: string;
          picture?: string;
        };

        profile.id = userinfo.sub;
        profile.email = userinfo.email;
        profile.name =
          userinfo.name ||
          [userinfo.given_name, userinfo.family_name].filter(Boolean).join(' ');
        if (userinfo.picture) {
          profile.imageUrl = userinfo.picture;
        }
      } catch {
        // Userinfo may not be available without openid scopes
      }

      if (connections.length > 0) {
        profile.organisations = connections.map(c => ({
          tenantId: c.tenantId,
          tenantName: c.tenantName,
          tenantType: c.tenantType
        }));
      }

      return { profile };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Custom Connection (Client Credentials)',
    key: 'client_credentials',

    inputSchema: z.object({
      clientId: z.string().describe('Client ID from Xero Developer Portal'),
      clientSecret: z.string().describe('Client Secret from Xero Developer Portal')
    }),

    getOutput: async ctx => {
      let tokenClient = createAxios({ baseURL: 'https://identity.xero.com' });
      let credentials = btoa(`${ctx.input.clientId}:${ctx.input.clientSecret}`);

      let tokenResponse: any;
      let tokenError: any;
      for (let scope of [LEGACY_CUSTOM_CONNECTION_SCOPES, GRANULAR_CUSTOM_CONNECTION_SCOPES]) {
        try {
          tokenResponse = await tokenClient.post(
            '/connect/token',
            new URLSearchParams({
              grant_type: 'client_credentials',
              scope
            }).toString(),
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${credentials}`
              }
            }
          );
          break;
        } catch (error) {
          tokenError = error;
        }
      }

      if (!tokenResponse) {
        throw xeroApiError(tokenError, 'client credentials token exchange');
      }

      let tokenData = tokenResponse.data as {
        access_token: string;
        expires_in?: number;
      };

      if (!tokenData.access_token) {
        throw xeroServiceError('Failed to obtain access token via client credentials.');
      }

      let expiresAt: string | undefined;
      if (tokenData.expires_in) {
        expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
      }

      return {
        output: {
          token: tokenData.access_token,
          expiresAt
        }
      };
    }
  });
