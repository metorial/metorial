import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Repository',
        description:
          'Full access to public and private repositories, including Actions workflows, runs, and artifacts',
        scope: 'repo'
      },
      {
        title: 'Public Repository',
        description: 'Access to public repositories only',
        scope: 'public_repo'
      },
      {
        title: 'Workflow',
        description: 'Manage GitHub Actions workflow files',
        scope: 'workflow'
      },
      {
        title: 'Admin: Organization',
        description:
          'Full management of organizations, required for organization-level secrets and runners',
        scope: 'admin:org'
      },
      {
        title: 'Write Organization',
        description: 'Write access to organization membership and settings',
        scope: 'write:org'
      },
      {
        title: 'Read Organization',
        description: 'Read access to organization membership',
        scope: 'read:org'
      },
      {
        title: 'Admin: Repo Hook',
        description: 'Full access to repository webhooks for configuring event triggers',
        scope: 'admin:repo_hook'
      },
      {
        title: 'Admin: Org Hook',
        description: 'Full access to organization webhooks',
        scope: 'admin:org_hook'
      },
      {
        title: 'User',
        description: 'Read/write access to user profile information',
        scope: 'user'
      },
      {
        title: 'User Email',
        description: 'Read access to email addresses',
        scope: 'user:email'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `https://github.com/login/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let http = createAxios();

      let response = await http.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        },
        {
          headers: {
            Accept: 'application/json'
          }
        }
      );

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        return { output: ctx.output };
      }

      let http = createAxios();

      let response = await http.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        },
        {
          headers: {
            Accept: 'application/json'
          }
        }
      );

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token ?? ctx.output.refreshToken
        }
      };
    },

    getProfile: async (ctx: any) => {
      let http = createAxios({
        baseURL: 'https://api.github.com',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          Accept: 'application/vnd.github+json'
        }
      });

      let response = await http.get('/user');
      let user = response.data;

      return {
        profile: {
          id: String(user.id),
          email: user.email ?? undefined,
          name: user.name ?? user.login,
          imageUrl: user.avatar_url
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
        .describe(
          'GitHub Personal Access Token (classic or fine-grained) with Actions permissions'
        )
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
        baseURL: 'https://api.github.com',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          Accept: 'application/vnd.github+json'
        }
      });

      let response = await http.get('/user');
      let user = response.data;

      return {
        profile: {
          id: String(user.id),
          email: user.email ?? undefined,
          name: user.name ?? user.login,
          imageUrl: user.avatar_url
        }
      };
    }
  });
