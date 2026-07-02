import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let figmaApi = createAxios({
  baseURL: 'https://api.figma.com'
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
    name: 'OAuth 2.0',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developers.figma.com/docs/rest-api/oauth-apps/'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.figma.com/docs/rest-api/scopes/'
      }
    ],

    scopes: [
      {
        title: 'Current User',
        description: 'Read user name, email, and profile image',
        scope: 'current_user:read'
      },
      {
        title: 'File Content',
        description: 'Read file contents (nodes, editor type)',
        scope: 'file_content:read'
      },
      {
        title: 'File Metadata',
        description: 'Read file metadata',
        scope: 'file_metadata:read'
      },
      {
        title: 'Read Comments',
        description: 'Read file comments',
        scope: 'file_comments:read'
      },
      {
        title: 'Write Comments',
        description: 'Post/delete comments and reactions',
        scope: 'file_comments:write'
      },
      {
        title: 'Read Dev Resources',
        description: 'Read dev resources in files',
        scope: 'file_dev_resources:read'
      },
      {
        title: 'Write Dev Resources',
        description: 'Write dev resources to files',
        scope: 'file_dev_resources:write'
      },
      {
        title: 'Read Variables',
        description: 'Read variables (Enterprise only)',
        defaultChecked: false,
        scope: 'file_variables:read'
      },
      {
        title: 'Write Variables',
        description: 'Write variables/collections (Enterprise only)',
        defaultChecked: false,
        scope: 'file_variables:write'
      },
      {
        title: 'File Versions',
        description: 'Read file version history',
        scope: 'file_versions:read'
      },
      {
        title: 'Library Analytics',
        description: 'Read design system analytics (Enterprise only)',
        defaultChecked: false,
        scope: 'library_analytics:read'
      },
      {
        title: 'Library Assets',
        description: 'Read published component/style data',
        scope: 'library_assets:read'
      },
      {
        title: 'Library Content',
        description: 'Read published components/styles of files',
        scope: 'library_content:read'
      },
      {
        title: 'Team Library Content',
        description: 'Read published components/styles of teams',
        scope: 'team_library_content:read'
      },
      {
        title: 'Projects',
        description: 'List projects and files in projects',
        scope: 'projects:read'
      },
      { title: 'Webhooks Read', description: 'Read webhook metadata', scope: 'webhooks:read' },
      {
        title: 'Webhooks Write',
        description: 'Create and manage webhooks',
        scope: 'webhooks:write'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        scope: ctx.scopes.join(','),
        state: ctx.state,
        response_type: 'code'
      });

      return {
        url: `https://www.figma.com/oauth?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await figmaApi.post(
        '/v1/oauth/token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri,
          code: ctx.code,
          grant_type: 'authorization_code'
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
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
        throw new Error('No refresh token available');
      }

      let response = await figmaApi.post(
        '/v1/oauth/refresh',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.output.refreshToken
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
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
          refreshToken: data.refresh_token ?? ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      let response = await figmaApi.get('/v1/me', {
        headers: { Authorization: `Bearer ${ctx.output.token}` }
      });

      let user = response.data;

      return {
        profile: {
          id: user.id,
          email: user.email,
          name: user.handle,
          imageUrl: user.img_url
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_access_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Figma Personal Access Token generated from Settings > Security')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let response = await figmaApi.get('/v1/me', {
        headers: { 'X-Figma-Token': ctx.output.token }
      });

      let user = response.data;

      return {
        profile: {
          id: user.id,
          email: user.email,
          name: user.handle,
          imageUrl: user.img_url
        }
      };
    }
  });
