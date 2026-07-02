import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      host: z.string().describe('Wrike API host, e.g. www.wrike.com or app-eu.wrike.com')
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Default',
        description: 'Default access scope',
        scope: 'Default'
      },
      {
        title: 'Read-Only Workspace',
        description: 'Read-only access to workspace data',
        scope: 'wsReadOnly'
      },
      {
        title: 'Read-Write Workspace',
        description: 'Read and write access to workspace data',
        scope: 'wsReadWrite'
      },
      {
        title: 'Read-Only Workflow',
        description: 'Read-only access to workflows',
        scope: 'amReadOnlyWorkflow'
      },
      {
        title: 'Read-Write Workflow',
        description: 'Read and write access to workflows',
        scope: 'amReadWriteWorkflow'
      },
      {
        title: 'Read-Only Invitation',
        description: 'Read-only access to invitations',
        scope: 'amReadOnlyInvitation'
      },
      {
        title: 'Read-Write Invitation',
        description: 'Read and write access to invitations',
        scope: 'amReadWriteInvitation'
      },
      {
        title: 'Read-Only Group',
        description: 'Read-only access to groups',
        scope: 'amReadOnlyGroup'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(','));
      }

      return {
        url: `https://login.wrike.com/oauth2/authorize/v4?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let axios = createAxios();

      let response = await axios.post(
        'https://login.wrike.com/oauth2/token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;
      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          host: data.host || 'www.wrike.com'
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw new Error('No refresh token available');
      }

      let axios = createAxios();

      let response = await axios.post(
        'https://login.wrike.com/oauth2/token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;
      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          host: data.host || ctx.output.host
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string; host: string };
      input: {};
      scopes: string[];
    }) => {
      let axios = createAxios({
        baseURL: `https://${ctx.output.host}/api/v4`,
        headers: {
          Authorization: `bearer ${ctx.output.token}`
        }
      });

      let response = await axios.get('/contacts?me=true');
      let contact = response.data?.data?.[0];

      return {
        profile: {
          id: contact?.id,
          name: `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim(),
          email: contact?.profiles?.[0]?.email
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Permanent Access Token',
    key: 'permanent_token',

    inputSchema: z.object({
      token: z.string().describe('Permanent access token generated from Wrike App Console'),
      host: z
        .string()
        .default('www.wrike.com')
        .describe('Wrike API host (e.g. www.wrike.com or app-eu.wrike.com)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          host: ctx.input.host
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string; host: string };
      input: { token: string; host: string };
    }) => {
      let axios = createAxios({
        baseURL: `https://${ctx.output.host}/api/v4`,
        headers: {
          Authorization: `bearer ${ctx.output.token}`
        }
      });

      let response = await axios.get('/contacts?me=true');
      let contact = response.data?.data?.[0];

      return {
        profile: {
          id: contact?.id,
          name: `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim(),
          email: contact?.profiles?.[0]?.email
        }
      };
    }
  });
