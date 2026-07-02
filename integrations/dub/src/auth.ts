import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let api = createAxios({
  baseURL: 'https://api.dub.co'
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

    scopes: [
      {
        title: 'Read Links',
        description: 'View links in the workspace',
        scope: 'links.read'
      },
      {
        title: 'Write Links',
        description: 'Create, update, and delete links',
        scope: 'links.write'
      },
      {
        title: 'Read Tags',
        description: 'View tags in the workspace',
        scope: 'tags.read'
      },
      {
        title: 'Write Tags',
        description: 'Create, update, and delete tags',
        scope: 'tags.write'
      },
      {
        title: 'Read Analytics',
        description: 'Retrieve analytics data for links and workspace',
        scope: 'analytics.read'
      },
      {
        title: 'Read Domains',
        description: 'View domains in the workspace',
        scope: 'domains.read'
      },
      {
        title: 'Write Domains',
        description: 'Add and manage custom domains',
        scope: 'domains.write'
      },
      {
        title: 'Read Folders',
        description: 'View folders in the workspace',
        scope: 'folders.read'
      },
      {
        title: 'Write Folders',
        description: 'Create and manage folders',
        scope: 'folders.write'
      },
      {
        title: 'Read Conversions',
        description: 'View conversion events (leads and sales)',
        scope: 'conversions.write'
      },
      {
        title: 'Read User',
        description: 'View user profile information',
        scope: 'user.read'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state
      });

      return {
        url: `https://app.dub.co/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await api.post(
        '/oauth/token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          grant_type: 'authorization_code'
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data as {
        access_token: string;
        refresh_token: string;
        token_type: string;
        expires_in: number;
        scope: string;
      };

      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let response = await api.post(
        '/oauth/token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken ?? ''
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data as {
        access_token: string;
        refresh_token: string;
        token_type: string;
        expires_in: number;
        scope: string;
      };

      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: {};
      scopes: string[];
    }) => {
      let response = await api.get('/oauth/userinfo', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let data = response.data as {
        user: { id: string; name: string; image: string };
        workspace: { id: string; slug: string; name: string; logo: string };
      };

      return {
        profile: {
          id: data.user.id,
          name: data.user.name,
          imageUrl: data.user.image,
          workspaceId: data.workspace.id,
          workspaceName: data.workspace.name,
          workspaceSlug: data.workspace.slug
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z.string().describe('Dub API key (starts with dub_)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
