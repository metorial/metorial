import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let identityAxios = createAxios({
  baseURL: 'https://identity.apaleo.com'
});

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
    name: 'OAuth (Connect Client)',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://apaleo.dev/guides/oauth-connection/auth-code-grant.html'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://apaleo.dev/guides/api/scopes.html'
      }
    ],

    scopes: [
      { title: 'OpenID', description: 'OpenID Connect authentication', scope: 'openid' },
      { title: 'Profile', description: 'User profile information', scope: 'profile' },
      {
        title: 'Offline Access',
        description: 'Obtain refresh tokens for long-lived access',
        scope: 'offline_access'
      },
      {
        title: 'Reservations Read',
        description: 'Read reservation data',
        scope: 'reservations.read'
      },
      {
        title: 'Reservations Manage',
        description: 'Create, modify, and cancel reservations',
        scope: 'reservations.manage'
      },
      {
        title: 'Availability Read',
        description: 'Read availability information',
        scope: 'availability.read'
      },
      {
        title: 'Availability Manage',
        description: 'Manage availability',
        scope: 'availability.manage'
      },
      { title: 'Offers Read', description: 'Read offers', scope: 'offers.read' },
      {
        title: 'Offer Index Read',
        description: 'Read offer index',
        scope: 'offer-index.read'
      },
      { title: 'Rates Read', description: 'Read rate information', scope: 'rates.read' },
      { title: 'Rates Manage', description: 'Manage rates', scope: 'rates.manage' },
      {
        title: 'Rate Plans Read Corporate',
        description: 'Read corporate rate plans',
        scope: 'rateplans.read-corporate'
      },
      {
        title: 'Setup Read',
        description: 'Read property setup and configuration',
        scope: 'setup.read'
      },
      {
        title: 'Setup Manage',
        description: 'Manage property setup and configuration',
        scope: 'setup.manage'
      },
      { title: 'Folios Read', description: 'Read folio data', scope: 'folios.read' },
      {
        title: 'Folios Manage',
        description: 'Manage folios, post charges and payments',
        scope: 'folios.manage'
      },
      { title: 'Invoices Read', description: 'Read invoice data', scope: 'invoices.read' },
      {
        title: 'Invoices Manage',
        description: 'Create and manage invoices',
        scope: 'invoices.manage'
      },
      {
        title: 'Companies Read',
        description: 'Read company profiles',
        scope: 'companies.read'
      },
      {
        title: 'Companies Manage',
        description: 'Create and manage company profiles',
        scope: 'companies.manage'
      },
      { title: 'Reports Read', description: 'Read report data', scope: 'reports.read' },
      { title: 'Logs Read', description: 'Read log data', scope: 'logs.read' },
      {
        title: 'Account Manage',
        description: 'Manage account settings',
        scope: 'account.manage'
      },
      {
        title: 'Accounting Read',
        description: 'Read accounting transaction data',
        scope: 'accounting.read'
      },
      {
        title: 'Maintenances Read',
        description: 'Read maintenance data',
        scope: 'maintenances.read'
      },
      {
        title: 'Maintenances Manage',
        description: 'Manage maintenance windows',
        scope: 'maintenances.manage'
      },
      {
        title: 'Night Audit',
        description: 'Trigger night audit operations',
        scope: 'operations.trigger-night-audit'
      },
      {
        title: 'Change Room State',
        description: 'Change room/unit states',
        scope: 'operations.change-room-state'
      },
      {
        title: 'Authorizations Read',
        description: 'Read payment authorizations',
        scope: 'authorizations.read'
      },
      {
        title: 'Authorizations Manage',
        description: 'Manage payment authorizations',
        scope: 'authorizations.manage'
      },
      {
        title: 'Payment Accounts Read',
        description: 'Read payment account data',
        scope: 'payment-accounts.read'
      },
      {
        title: 'Payment Accounts Manage',
        description: 'Manage payment accounts',
        scope: 'payment-accounts.manage'
      },
      {
        title: 'Account Users Read',
        description: 'Read account user information',
        scope: 'identity:account-users.read'
      },
      {
        title: 'Account Users Manage',
        description: 'Manage account users',
        scope: 'identity:account-users.manage'
      },
      {
        title: 'UI Integrations Manage',
        description: 'Manage UI integrations',
        scope: 'integration:ui-integrations.manage'
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
        url: `https://identity.apaleo.com/connect/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await identityAxios.post(
        '/connect/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;

      let expiresAt: string | undefined;
      if (data.expires_in) {
        expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw new Error(
          'No refresh token available. Re-authenticate with the offline_access scope.'
        );
      }

      let response = await identityAxios.post(
        '/connect/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;

      let expiresAt: string | undefined;
      if (data.expires_in) {
        expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: {};
      scopes: string[];
    }) => {
      let response = await identityAxios.get('/connect/userinfo', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let data = response.data;

      return {
        profile: {
          id: data.sub,
          email: data.email,
          name:
            data.name ||
            [data.given_name, data.family_name].filter(Boolean).join(' ') ||
            undefined
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Client Credentials (Simple Client)',
    key: 'client_credentials',

    inputSchema: z.object({
      clientId: z.string().describe('Client ID for the simple client'),
      clientSecret: z.string().describe('Client secret for the simple client')
    }),

    getOutput: async ctx => {
      let credentials = Buffer.from(
        `${ctx.input.clientId}:${ctx.input.clientSecret}`
      ).toString('base64');

      let response = await identityAxios.post(
        '/connect/token',
        new URLSearchParams({
          grant_type: 'client_credentials'
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`
          }
        }
      );

      let data = response.data;

      let expiresAt: string | undefined;
      if (data.expires_in) {
        expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      }

      return {
        output: {
          token: data.access_token,
          expiresAt
        }
      };
    }
  });
