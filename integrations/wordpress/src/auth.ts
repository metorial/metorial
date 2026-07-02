import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let wpcomAxios = createAxios({
  baseURL: 'https://public-api.wordpress.com'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      authMethod: z
        .enum(['oauth', 'application_password'])
        .describe('Which authentication method is being used')
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'WordPress.com OAuth',
    key: 'wpcom_oauth',

    scopes: [
      { title: 'Users', description: 'Access to user information', scope: 'users' },
      {
        title: 'Sites',
        description: 'Access to site information and settings',
        scope: 'sites'
      },
      { title: 'Posts', description: 'Read and write posts', scope: 'posts' },
      { title: 'Comments', description: 'Read and manage comments', scope: 'comments' },
      {
        title: 'Taxonomy',
        description: 'Manage categories, tags, and taxonomies',
        scope: 'taxonomy'
      },
      {
        title: 'Follow',
        description: 'Manage blog following and subscriptions',
        scope: 'follow'
      },
      { title: 'Sharing', description: 'Manage social sharing settings', scope: 'sharing' },
      { title: 'Notifications', description: 'Access notifications', scope: 'notifications' },
      { title: 'Insights', description: 'Access site insights', scope: 'insights' },
      { title: 'Read', description: 'Read access to the WordPress.com Reader', scope: 'read' },
      { title: 'Stats', description: 'Access site statistics', scope: 'stats' },
      { title: 'Media', description: 'Upload and manage media files', scope: 'media' },
      { title: 'Menus', description: 'Manage navigation menus', scope: 'menus' },
      { title: 'Videos', description: 'Manage video uploads', scope: 'videos' },
      {
        title: 'Global',
        description: 'Comprehensive access across all sites',
        scope: 'global'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state
      });

      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(','));
      }

      return {
        url: `https://public-api.wordpress.com/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await wpcomAxios.post(
        '/oauth2/token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          grant_type: 'authorization_code',
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : undefined,
          authMethod: 'oauth' as const
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      let response = await wpcomAxios.get('/rest/v1.1/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let me = response.data;

      return {
        profile: {
          id: String(me.ID),
          email: me.email,
          name: me.display_name,
          imageUrl: me.avatar_URL,
          username: me.username,
          primaryBlogUrl: me.primary_blog_url
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Application Password',
    key: 'application_password',

    inputSchema: z.object({
      username: z.string().describe('WordPress username'),
      applicationPassword: z
        .string()
        .describe(
          'Application password generated from WordPress admin (Users → Edit User → Application Passwords)'
        )
    }),

    getOutput: async (ctx: { input: { username: string; applicationPassword: string } }) => {
      let credentials = btoa(`${ctx.input.username}:${ctx.input.applicationPassword}`);
      return {
        output: {
          token: credentials,
          authMethod: 'application_password' as const
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string };
      input: { username: string; applicationPassword: string };
    }) => {
      let decoded = atob(ctx.output.token);
      let username = decoded.split(':')[0] || '';
      return {
        profile: {
          name: username,
          username: username
        }
      };
    }
  });
