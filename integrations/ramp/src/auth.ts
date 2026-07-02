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
        url: 'https://docs.ramp.com/developer-api/v1/authorization'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://docs.ramp.com/developer-api/v1/authorization'
      }
    ],

    scopes: [
      {
        title: 'Transactions Read',
        description: 'Read card transactions',
        scope: 'transactions:read'
      },
      { title: 'Cards Read', description: 'Read card information', scope: 'cards:read' },
      { title: 'Cards Write', description: 'Create and manage cards', scope: 'cards:write' },
      {
        title: 'Spend Programs Read',
        description: 'Read spend programs',
        scope: 'spend_programs:read'
      },
      {
        title: 'Spend Programs Write',
        description: 'Create and manage spend programs',
        scope: 'spend_programs:write'
      },
      { title: 'Users Read', description: 'Read user information', scope: 'users:read' },
      { title: 'Users Write', description: 'Create and manage users', scope: 'users:write' },
      { title: 'Locations Read', description: 'Read location data', scope: 'locations:read' },
      {
        title: 'Locations Write',
        description: 'Create and manage locations',
        scope: 'locations:write'
      },
      { title: 'Limits Read', description: 'Read spending limits', scope: 'limits:read' },
      {
        title: 'Limits Write',
        description: 'Create and manage spending limits',
        scope: 'limits:write'
      },
      {
        title: 'Departments Read',
        description: 'Read department data',
        scope: 'departments:read'
      },
      {
        title: 'Departments Write',
        description: 'Create and manage departments',
        scope: 'departments:write'
      },
      {
        title: 'Business Read',
        description: 'Read business account information',
        scope: 'business:read'
      },
      { title: 'Receipts Read', description: 'Read receipt data', scope: 'receipts:read' },
      {
        title: 'Receipts Write',
        description: 'Upload and manage receipts',
        scope: 'receipts:write'
      },
      { title: 'Bills Read', description: 'Read bill data', scope: 'bills:read' },
      { title: 'Bills Write', description: 'Create and manage bills', scope: 'bills:write' },
      {
        title: 'Transfers Read',
        description: 'Read bank transfer data',
        scope: 'transfers:read'
      },
      { title: 'Vendors Read', description: 'Read vendor information', scope: 'vendors:read' },
      { title: 'Merchants Read', description: 'Read merchant data', scope: 'merchants:read' },
      {
        title: 'Accounting Read',
        description: 'Read accounting data',
        scope: 'accounting:read'
      },
      {
        title: 'Reimbursements Read',
        description: 'Read reimbursement data',
        scope: 'reimbursements:read'
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
        url: `https://app.ramp.com/v1/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let axios = createAxios();

      let credentials = Buffer.from(`${ctx.clientId}:${ctx.clientSecret}`).toString('base64');

      let response = await axios.post(
        'https://api.ramp.com/developer/v1/token',
        {
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        },
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json'
          }
        }
      );

      let expiresAt = response.data.expires_in
        ? new Date(Date.now() + response.data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: response.data.access_token,
          refreshToken: response.data.refresh_token,
          expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        return { output: ctx.output };
      }

      let axios = createAxios();

      let credentials = Buffer.from(`${ctx.clientId}:${ctx.clientSecret}`).toString('base64');

      let response = await axios.post(
        'https://api.ramp.com/developer/v1/token',
        {
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        },
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json'
          }
        }
      );

      let expiresAt = response.data.expires_in
        ? new Date(Date.now() + response.data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: response.data.access_token,
          refreshToken: response.data.refresh_token || ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: any) => {
      let axios = createAxios({
        baseURL: 'https://api.ramp.com/developer/v1',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await axios.get('/business');

      return {
        profile: {
          id: response.data.id,
          name: response.data.business_name_legal || response.data.business_name_on_card
        }
      };
    }
  });
