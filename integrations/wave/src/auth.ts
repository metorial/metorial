import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let tokenAxios = createAxios({
  baseURL: 'https://api.waveapps.com/oauth2'
});

let graphqlAxios = createAxios({
  baseURL: 'https://gql.waveapps.com'
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
    name: 'OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developer.waveapps.com/hc/en-us/articles/360019493652-OAuth-Guide'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developer.waveapps.com/hc/en-us/articles/360032818132-OAuth-Scopes'
      }
    ],

    scopes: [
      {
        title: 'Account Read',
        description: 'Read access to chart of accounts',
        scope: 'account:read'
      },
      {
        title: 'Account Write',
        description: 'Write access to chart of accounts (create, update, archive)',
        scope: 'account:write'
      },
      {
        title: 'Business Read',
        description: 'Read access to business information',
        scope: 'business:read'
      },
      {
        title: 'Customer Read',
        description: 'Read access to customers',
        scope: 'customer:read'
      },
      {
        title: 'Customer Write',
        description: 'Write access to customers (create, update, delete)',
        scope: 'customer:write'
      },
      {
        title: 'Invoice Read',
        description: 'Read access to invoices and estimates',
        scope: 'invoice:read'
      },
      {
        title: 'Invoice Write',
        description: 'Write access to invoices (create, update, send, delete)',
        scope: 'invoice:write'
      },
      {
        title: 'Product Read',
        description: 'Read access to products and services',
        scope: 'product:read'
      },
      {
        title: 'Product Write',
        description: 'Write access to products and services (create, update, archive)',
        scope: 'product:write'
      },
      {
        title: 'Sales Tax Read',
        description: 'Read access to sales tax entries',
        scope: 'sales_tax:read'
      },
      {
        title: 'Sales Tax Write',
        description: 'Write access to sales taxes (create, update, archive)',
        scope: 'sales_tax:write'
      },
      {
        title: 'Transaction Read',
        description: 'Read access to financial transactions',
        scope: 'transaction:read'
      },
      {
        title: 'Transaction Write',
        description: 'Write access to financial transactions',
        scope: 'transaction:write'
      },
      {
        title: 'Vendor Read',
        description: 'Read access to vendors',
        scope: 'vendor:read'
      },
      {
        title: 'User Read',
        description: 'Read access to user profile information',
        scope: 'user:read'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `https://api.waveapps.com/oauth2/authorize/?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await tokenAxios.post(
        '/token/',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type: string;
      };

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
        throw new Error('No refresh token available');
      }

      let response = await tokenAxios.post(
        '/token/',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type: string;
      };

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
      let response = await graphqlAxios.post(
        '/graphql/public',
        {
          query: `query { user { id firstName lastName defaultEmail } }`
        },
        {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      let user = (response.data as any)?.data?.user;

      let name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || undefined;

      return {
        profile: {
          id: user?.id,
          email: user?.defaultEmail,
          name
        }
      };
    }
  });
