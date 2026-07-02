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
        url: 'https://docs.sentry.io/product/partnership-platform/oauth-integration/'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://docs.sentry.io/api/permissions/'
      }
    ],

    scopes: [
      {
        title: 'Organization Read',
        description: 'Read access to organization data',
        scope: 'org:read'
      },
      {
        title: 'Organization Write',
        description: 'Write access to organization data',
        scope: 'org:write'
      },
      {
        title: 'Organization Admin',
        description: 'Admin access to organization data',
        scope: 'org:admin'
      },
      {
        title: 'Project Read',
        description: 'Read access to project data',
        scope: 'project:read'
      },
      {
        title: 'Project Write',
        description: 'Write access to project data',
        scope: 'project:write'
      },
      {
        title: 'Project Admin',
        description: 'Admin access to project data',
        scope: 'project:admin'
      },
      {
        title: 'Project Releases',
        description: 'Access to release data for projects and organizations',
        scope: 'project:releases'
      },
      {
        title: 'Team Read',
        description: 'Read access to team data',
        scope: 'team:read'
      },
      {
        title: 'Team Write',
        description: 'Write access to team data',
        scope: 'team:write'
      },
      {
        title: 'Team Admin',
        description: 'Admin access to team data',
        scope: 'team:admin'
      },
      {
        title: 'Member Read',
        description: 'Read access to member data',
        scope: 'member:read'
      },
      {
        title: 'Member Write',
        description: 'Write access to member data',
        scope: 'member:write'
      },
      {
        title: 'Member Admin',
        description: 'Admin access to member data',
        scope: 'member:admin'
      },
      {
        title: 'Event Read',
        description: 'Read access to issues and events',
        scope: 'event:read'
      },
      {
        title: 'Event Write',
        description: 'Write access to issues and events',
        scope: 'event:write'
      },
      {
        title: 'Event Admin',
        description: 'Admin access to issues and events',
        scope: 'event:admin'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        response_type: 'code',
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `https://sentry.io/oauth/authorize/?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let httpClient = createAxios();

      let response = await httpClient.post(
        'https://sentry.io/oauth/token/',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;
      let expiresAt = data.expires_at
        ? data.expires_at
        : data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000).toISOString()
          : undefined;

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
        return { output: ctx.output };
      }

      let httpClient = createAxios();

      let response = await httpClient.post(
        'https://sentry.io/oauth/token/',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;
      let expiresAt = data.expires_at
        ? data.expires_at
        : data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000).toISOString()
          : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: any) => {
      let httpClient = createAxios({
        baseURL: 'https://sentry.io/api/0',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await httpClient.get('/');
      let user = response.data?.user;

      return {
        profile: {
          id: user?.id,
          email: user?.email,
          name: user?.name,
          imageUrl: user?.avatarUrl
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Auth Token',
    key: 'auth_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Sentry Auth Token (Organization, Internal Integration, or Personal token)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let httpClient = createAxios({
        baseURL: 'https://sentry.io/api/0',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await httpClient.get('/');
      let user = response.data?.user;

      return {
        profile: {
          id: user?.id,
          email: user?.email,
          name: user?.name,
          imageUrl: user?.avatarUrl
        }
      };
    }
  });
