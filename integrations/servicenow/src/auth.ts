import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      instanceName: z.string()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth',

    scopes: [
      {
        title: 'User Account',
        description: 'Access to user account information and preferences',
        scope: 'useraccount'
      }
    ],

    inputSchema: z.object({
      instanceName: z
        .string()
        .describe(
          'ServiceNow instance name (subdomain), e.g. "mycompany" for mycompany.service-now.com'
        )
    }),

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(' '));
      }

      let url = `https://${ctx.input.instanceName}.service-now.com/oauth_auth.do?${params.toString()}`;

      return {
        url,
        input: ctx.input
      };
    },

    handleCallback: async ctx => {
      let ax = createAxios({
        baseURL: `https://${ctx.input.instanceName}.service-now.com`
      });

      let response = await ax.post(
        '/oauth_token.do',
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

      let expiresAt: string | undefined;
      if (data.expires_in) {
        expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          instanceName: ctx.input.instanceName
        },
        input: ctx.input
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw new Error('No refresh token available');
      }

      let ax = createAxios({
        baseURL: `https://${ctx.output.instanceName}.service-now.com`
      });

      let response = await ax.post(
        '/oauth_token.do',
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

      let expiresAt: string | undefined;
      if (data.expires_in) {
        expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt,
          instanceName: ctx.output.instanceName
        },
        input: ctx.input
      };
    },

    getProfile: async (ctx: any) => {
      let ax = createAxios({
        baseURL: `https://${ctx.output.instanceName}.service-now.com`,
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          Accept: 'application/json'
        }
      });

      let response = await ax.get('/api/now/table/sys_user', {
        params: {
          sysparm_query: 'user_name=javascript:gs.getUserName()',
          sysparm_limit: 1,
          sysparm_fields: 'sys_id,user_name,email,name,photo'
        }
      });

      let user = response.data?.result?.[0];

      return {
        profile: {
          id: user?.sys_id,
          email: user?.email,
          name: user?.name,
          imageUrl: user?.photo || undefined
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Basic Authentication',
    key: 'basic_auth',

    inputSchema: z.object({
      instanceName: z
        .string()
        .describe(
          'ServiceNow instance name (subdomain), e.g. "mycompany" for mycompany.service-now.com'
        ),
      username: z.string().describe('ServiceNow username'),
      password: z.string().describe('ServiceNow password')
    }),

    getOutput: async ctx => {
      let basicToken = Buffer.from(`${ctx.input.username}:${ctx.input.password}`).toString(
        'base64'
      );

      return {
        output: {
          token: basicToken,
          instanceName: ctx.input.instanceName
        }
      };
    },

    getProfile: async (ctx: any) => {
      let ax = createAxios({
        baseURL: `https://${ctx.output.instanceName}.service-now.com`,
        headers: {
          Authorization: `Basic ${ctx.output.token}`,
          Accept: 'application/json'
        }
      });

      let response = await ax.get('/api/now/table/sys_user', {
        params: {
          sysparm_query: `user_name=${ctx.input.username}`,
          sysparm_limit: 1,
          sysparm_fields: 'sys_id,user_name,email,name,photo'
        }
      });

      let user = response.data?.result?.[0];

      return {
        profile: {
          id: user?.sys_id,
          email: user?.email,
          name: user?.name,
          imageUrl: user?.photo || undefined
        }
      };
    }
  });
