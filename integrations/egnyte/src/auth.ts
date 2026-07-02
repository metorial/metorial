import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      domain: z.string().describe('Egnyte domain (subdomain part of {domain}.egnyte.com)')
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'File System',
        description: 'Read, write, and delete files and folders',
        scope: 'Egnyte.filesystem'
      },
      {
        title: 'Links',
        description: 'Create and delete file/folder sharing links',
        scope: 'Egnyte.link'
      },
      {
        title: 'Users',
        description: 'Create, update, and delete users',
        scope: 'Egnyte.user'
      },
      {
        title: 'Permissions',
        description: 'Add, update, delete, and report on folder permissions',
        scope: 'Egnyte.permission'
      },
      {
        title: 'Audit',
        description: 'Generate audit reports for login, file, and permission activity',
        scope: 'Egnyte.audit'
      },
      {
        title: 'Bookmarks',
        description: 'Manage bookmarks to files and folders',
        scope: 'Egnyte.bookmark'
      },
      {
        title: 'Project Folders',
        description: 'Manage project folder structures and activities',
        scope: 'Egnyte.projectfolders'
      }
    ],

    inputSchema: z.object({
      domain: z
        .string()
        .describe(
          'Your Egnyte domain (the subdomain part of {domain}.egnyte.com, e.g. "mycompany")'
        )
    }),

    getAuthorizationUrl: async ctx => {
      let domain = ctx.input.domain;
      let scopeString = ctx.scopes.join(' ');
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        scope: scopeString
      });

      return {
        url: `https://${domain}.egnyte.com/puboauth/token?${params.toString()}`,
        input: { domain }
      };
    },

    handleCallback: async ctx => {
      let domain = ctx.input.domain;
      let http = createAxios({
        baseURL: `https://${domain}.egnyte.com`
      });

      let response = await http.post(
        '/puboauth/token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri,
          code: ctx.code,
          grant_type: 'authorization_code',
          scope: ctx.scopes.join(' ')
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
          expiresAt,
          domain
        },
        input: { domain }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let domain = ctx.output.domain || ctx.input.domain;
      let http = createAxios({
        baseURL: `https://${domain}.egnyte.com`
      });

      let response = await http.post(
        '/puboauth/token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken || ''
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
          expiresAt,
          domain
        },
        input: { domain }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string; domain: string };
      input: { domain: string };
      scopes: string[];
    }) => {
      let domain = ctx.output.domain;
      let http = createAxios({
        baseURL: `https://${domain}.egnyte.com`
      });

      let response = await http.get('/pubapi/v1/userinfo', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let data = response.data as {
        id: number;
        first_name: string;
        last_name: string;
        username: string;
        email?: string;
      };

      return {
        profile: {
          id: String(data.id),
          name: `${data.first_name} ${data.last_name}`.trim(),
          email: data.email || data.username
        }
      };
    }
  });
