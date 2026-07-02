import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let oauthAxios = createAxios({
  baseURL: 'https://app.frontapp.com'
});

let apiAxios = createAxios({
  baseURL: 'https://api2.frontapp.com'
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
        url: 'https://dev.frontapp.com/docs/oauth'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://dev.frontapp.com/docs/authentication'
      }
    ],

    scopes: [
      {
        title: 'Read Shared',
        description:
          'Read access to shared workspace resources (conversations, inboxes, tags, etc.)',
        scope: 'shared:resources:read'
      },
      {
        title: 'Write Shared',
        description: 'Write access to shared workspace resources',
        scope: 'shared:resources:write'
      },
      {
        title: 'Delete Shared',
        description: 'Delete access to shared workspace resources',
        scope: 'shared:resources:delete'
      },
      {
        title: 'Send Shared',
        description: 'Send messages from shared inboxes',
        scope: 'shared:resources:send'
      },
      {
        title: 'Read Global',
        description:
          'Read access to global/company-level resources (teams, accounts, company rules)',
        scope: 'global:resources:read'
      },
      {
        title: 'Write Global',
        description: 'Write access to global/company-level resources',
        scope: 'global:resources:write'
      },
      {
        title: 'Delete Global',
        description: 'Delete access to global/company-level resources',
        scope: 'global:resources:delete'
      },
      {
        title: 'Read Private',
        description: 'Read access to private/individual teammate resources',
        scope: 'private:resources:read'
      },
      {
        title: 'Write Private',
        description: 'Write access to private/individual teammate resources',
        scope: 'private:resources:write'
      },
      {
        title: 'Delete Private',
        description: 'Delete access to private/individual teammate resources',
        scope: 'private:resources:delete'
      },
      {
        title: 'Send Private',
        description: 'Send messages from private inboxes',
        scope: 'private:resources:send'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      return {
        url: `https://app.frontapp.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response = await oauthAxios.post(
        '/oauth/token',
        {
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          grant_type: 'authorization_code'
        },
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json'
          }
        }
      );

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_at ? String(data.expires_at) : undefined
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response = await oauthAxios.post(
        '/oauth/token',
        {
          refresh_token: ctx.output.refreshToken,
          grant_type: 'refresh_token'
        },
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json'
          }
        }
      );

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt: data.expires_at ? String(data.expires_at) : undefined
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: {};
      scopes: string[];
    }) => {
      let response = await apiAxios.get('/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let data = response.data;

      return {
        profile: {
          id: data.id,
          name: data.name
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      apiToken: z
        .string()
        .describe('Front API token created in Settings > Developers > API Tokens')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: { apiToken: string };
    }) => {
      let response = await apiAxios.get('/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let data = response.data;

      return {
        profile: {
          id: data.id,
          name: data.name
        }
      };
    }
  });
