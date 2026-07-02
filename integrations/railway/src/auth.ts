import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let httpClient = createAxios({
  baseURL: 'https://backboard.railway.com'
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
    name: 'Login with Railway',
    key: 'oauth',

    scopes: [
      {
        title: 'OpenID',
        description: 'Required for authentication (always included)',
        scope: 'openid'
      },
      {
        title: 'Email',
        description: 'Access your email address',
        scope: 'email'
      },
      {
        title: 'Profile',
        description: 'Access your name and picture',
        scope: 'profile'
      },
      {
        title: 'Offline Access',
        description: 'Stay connected with refresh tokens for long-lived access',
        scope: 'offline_access'
      },
      {
        title: 'Workspace Viewer',
        description: 'Viewer access to selected workspaces',
        scope: 'workspace:viewer'
      },
      {
        title: 'Workspace Member',
        description: 'Member access to selected workspaces',
        scope: 'workspace:member'
      },
      {
        title: 'Workspace Admin',
        description: 'Admin access to selected workspaces',
        scope: 'workspace:admin'
      },
      {
        title: 'Project Viewer',
        description: 'Viewer access to selected projects',
        scope: 'project:viewer'
      },
      {
        title: 'Project Member',
        description: 'Member access to selected projects',
        scope: 'project:member'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });

      if (ctx.scopes.includes('offline_access')) {
        params.set('prompt', 'consent');
      }

      return {
        url: `https://backboard.railway.com/oauth/auth?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response = await httpClient.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;
      let expiresAt = data.expires_in
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

      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response = await httpClient.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;
      let expiresAt = data.expires_in
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

    getProfile: async (ctx: {
      output: { token: string };
      input: Record<string, never>;
      scopes: string[];
    }) => {
      let response = await httpClient.get('/oauth/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let data = response.data;

      return {
        profile: {
          id: data.sub,
          email: data.email,
          name: data.name,
          imageUrl: data.picture
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z.string().describe('Railway API token (Account or Workspace token)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let response = await httpClient.post(
        '/graphql/v2',
        {
          query: `query { me { id name email } }`
        },
        {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      let me = response.data?.data?.me;

      return {
        profile: {
          id: me?.id,
          email: me?.email,
          name: me?.name
        }
      };
    }
  });
