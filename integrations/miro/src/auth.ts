import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let axios = createAxios({
  baseURL: 'https://api.miro.com'
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
    name: 'Miro OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developers.miro.com/docs/getting-started-with-oauth'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.miro.com/reference/scopes'
      }
    ],

    scopes: [
      {
        title: 'Read Boards',
        description: 'Retrieve information about boards, board members, or items',
        scope: 'boards:read'
      },
      {
        title: 'Write Boards',
        description: 'Create, update, or delete boards, board members, or items',
        scope: 'boards:write'
      },
      {
        title: 'Read Audit Logs',
        description: 'Read audit logs (Enterprise only)',
        scope: 'auditlogs:read'
      },
      {
        title: 'Read Organizations',
        description: 'Retrieve organization information (Enterprise only)',
        scope: 'organizations:read'
      },
      {
        title: 'Read Org Teams',
        description: 'Retrieve team info for an organization (Enterprise only)',
        scope: 'organizations:teams:read'
      },
      {
        title: 'Write Org Teams',
        description: 'Create and manage teams for an organization (Enterprise only)',
        scope: 'organizations:teams:write'
      },
      {
        title: 'Read Projects',
        description: 'Retrieve project information',
        scope: 'projects:read'
      },
      {
        title: 'Write Projects',
        description: 'Create or manage projects',
        scope: 'projects:write'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let scopeString = ctx.scopes.join(' ');
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });
      if (scopeString) {
        params.set('scope', scopeString);
      }
      return {
        url: `https://miro.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await axios.post('/v1/oauth/token', null, {
        params: {
          grant_type: 'authorization_code',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        }
      });

      let data = response.data;
      let output: { token: string; refreshToken?: string; expiresAt?: string } = {
        token: data.access_token
      };

      if (data.refresh_token) {
        output.refreshToken = data.refresh_token;
      }

      if (data.expires_in) {
        let expiresAt = new Date(Date.now() + data.expires_in * 1000);
        output.expiresAt = expiresAt.toISOString();
      }

      return { output };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        return { output: ctx.output };
      }

      let response = await axios.post('/v1/oauth/token', null, {
        params: {
          grant_type: 'refresh_token',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.output.refreshToken
        }
      });

      let data = response.data;
      let output: { token: string; refreshToken?: string; expiresAt?: string } = {
        token: data.access_token
      };

      if (data.refresh_token) {
        output.refreshToken = data.refresh_token;
      }

      if (data.expires_in) {
        let expiresAt = new Date(Date.now() + data.expires_in * 1000);
        output.expiresAt = expiresAt.toISOString();
      }

      return { output };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
    }) => {
      let response = await axios.get('/v1/oauth-token', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let data = response.data;
      let user = data.user || {};
      return {
        profile: {
          id: user.id?.toString(),
          name: user.name,
          teamId: data.team?.id?.toString(),
          teamName: data.team?.name
        }
      };
    }
  });
