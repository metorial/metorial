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
    name: 'OAuth 2.0',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://workable.readme.io/page/oauth'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://workable.readme.io/reference'
      }
    ],

    scopes: [
      {
        title: 'Read Jobs',
        description: 'Read access to jobs',
        scope: 'r_jobs'
      },
      {
        title: 'Read Candidates',
        description: 'Read access to candidates',
        scope: 'r_candidates'
      },
      {
        title: 'Write Candidates',
        description: 'Write access to candidates (create, update, move stages)',
        scope: 'w_candidates'
      },
      {
        title: 'Read Employees',
        description: 'Read access to employees',
        scope: 'r_employees'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let scopeString = ctx.scopes.join('+');
      let url = `https://www.workable.com/oauth/authorize?client_id=${encodeURIComponent(ctx.clientId)}&redirect_uri=${encodeURIComponent(ctx.redirectUri)}&state=${encodeURIComponent(ctx.state)}&response_type=code&scope=${scopeString}`;
      return { url };
    },

    handleCallback: async ctx => {
      let axios = createAxios();
      let response = await axios.post('https://www.workable.com/oauth/token', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        redirect_uri: ctx.redirectUri,
        grant_type: 'authorization_code'
      });

      let data = response.data;
      let expiresAt = new Date(Date.now() + (data.expires_in || 7200) * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let axios = createAxios();
      let response = await axios.post('https://www.workable.com/oauth/token', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        refresh_token: ctx.output.refreshToken,
        grant_type: 'refresh_token'
      });

      let data = response.data;
      let expiresAt = new Date(Date.now() + (data.expires_in || 7200) * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      let axios = createAxios({
        baseURL: 'https://www.workable.com/spi/v3'
      });

      let response = await axios.get('/accounts', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let accounts = response.data.accounts;
      let account = accounts?.[0];

      return {
        profile: {
          id: account?.subdomain,
          name: account?.name || account?.subdomain
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Access Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Workable API access token (generated from Settings > Integrations > Apps)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let axios = createAxios({
        baseURL: 'https://www.workable.com/spi/v3'
      });

      let response = await axios.get('/accounts', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let accounts = response.data.accounts;
      let account = accounts?.[0];

      return {
        profile: {
          id: account?.subdomain,
          name: account?.name || account?.subdomain
        }
      };
    }
  });
