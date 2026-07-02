import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
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
        url: 'https://developers.webflow.com/data/reference/oauth-app'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.webflow.com/data/reference/scopes'
      }
    ],

    scopes: [
      {
        title: 'Sites Read',
        description: 'View site information and metadata',
        scope: 'sites:read'
      },
      {
        title: 'Sites Write',
        description: 'Publish sites and modify site settings',
        scope: 'sites:write'
      },
      {
        title: 'Pages Read',
        description: 'View pages and page metadata',
        scope: 'pages:read'
      },
      {
        title: 'Pages Write',
        description: 'Create, update, and delete pages',
        scope: 'pages:write'
      },
      {
        title: 'CMS Read',
        description: 'View collections and collection items',
        scope: 'cms:read'
      },
      {
        title: 'CMS Write',
        description: 'Create, update, and delete collections and items',
        scope: 'cms:write'
      },
      {
        title: 'Assets Read',
        description: 'View assets and asset folders',
        scope: 'assets:read'
      },
      {
        title: 'Assets Write',
        description: 'Upload and manage assets',
        scope: 'assets:write'
      },
      {
        title: 'Forms Read',
        description: 'View form structures and submissions',
        scope: 'forms:read'
      },
      { title: 'Forms Write', description: 'Manage form submissions', scope: 'forms:write' },
      {
        title: 'Ecommerce Read',
        description: 'View products, orders, and inventory',
        scope: 'ecommerce:read'
      },
      {
        title: 'Ecommerce Write',
        description: 'Manage products, orders, and inventory',
        scope: 'ecommerce:write'
      },
      {
        title: 'Users Read',
        description: 'View user accounts and access groups',
        scope: 'users:read'
      },
      {
        title: 'Users Write',
        description: 'Manage user accounts and memberships',
        scope: 'users:write'
      },
      {
        title: 'Custom Code Read',
        description: 'View custom code on sites and pages',
        scope: 'custom_code:read'
      },
      {
        title: 'Custom Code Write',
        description: 'Add and manage custom code',
        scope: 'custom_code:write'
      },
      {
        title: 'Comments Read',
        description: 'View comment threads and replies',
        scope: 'comments:read'
      },
      { title: 'Comments Write', description: 'Manage comments', scope: 'comments:write' },
      {
        title: 'Components Read',
        description: 'View reusable components',
        scope: 'components:read'
      },
      {
        title: 'Components Write',
        description: 'Manage reusable components',
        scope: 'components:write'
      },
      {
        title: 'Authorized User',
        description: 'View information about the authenticated user',
        scope: 'authorized_user:read'
      },
      {
        title: 'Site Activity',
        description: 'View site activity logs',
        scope: 'site_activity:read'
      },
      {
        title: 'Site Config Read',
        description: 'View site configuration and redirects',
        scope: 'site_config:read'
      },
      {
        title: 'Site Config Write',
        description: 'Manage site configuration and redirects',
        scope: 'site_config:write'
      },
      {
        title: 'Workspace Read',
        description: 'View workspace information',
        scope: 'workspace:read'
      },
      {
        title: 'Workspace Write',
        description: 'Manage workspace settings',
        scope: 'workspace:write'
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
        url: `https://webflow.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let http = createAxios({
        baseURL: 'https://api.webflow.com'
      });

      let response = await http.post('/oauth/access_token', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        grant_type: 'authorization_code',
        redirect_uri: ctx.redirectUri
      });

      let data = response.data as { access_token: string };

      return {
        output: {
          token: data.access_token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let http = createAxios({
        baseURL: 'https://api.webflow.com/v2',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await http.get('/token/authorized_by');
      let user = response.data as {
        id?: string;
        email?: string;
        firstName?: string;
        lastName?: string;
      };

      return {
        profile: {
          id: user.id,
          email: user.email,
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Site Token',
    key: 'site_token',

    inputSchema: z.object({
      token: z.string().describe('Webflow Site API Token')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let http = createAxios({
        baseURL: 'https://api.webflow.com/v2',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      try {
        let response = await http.get('/token/authorized_by');
        let user = response.data as {
          id?: string;
          email?: string;
          firstName?: string;
          lastName?: string;
        };

        return {
          profile: {
            id: user.id,
            email: user.email,
            name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined
          }
        };
      } catch {
        return {
          profile: {}
        };
      }
    }
  });
