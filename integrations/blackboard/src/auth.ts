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
    name: 'OAuth (User Authorization)',
    key: 'oauth_3lo',

    scopes: [
      {
        title: 'Read',
        description: 'Read access to Blackboard Learn data',
        scope: 'read'
      },
      {
        title: 'Write',
        description: 'Write access to Blackboard Learn data',
        scope: 'write'
      },
      {
        title: 'Offline',
        description: 'Offline access with refresh token support (no repeated login required)',
        scope: 'offline'
      }
    ],

    inputSchema: z.object({
      baseUrl: z
        .string()
        .describe(
          'The base URL of your Blackboard Learn instance (e.g., https://yourschool.blackboard.com)'
        )
    }),

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        client_id: ctx.clientId,
        scope: ctx.scopes.join(' '),
        state: ctx.state
      });

      let baseUrl = ctx.input.baseUrl.replace(/\/+$/, '');
      let url = `${baseUrl}/learn/api/public/v1/oauth2/authorizationcode?${params.toString()}`;

      return { url, input: ctx.input };
    },

    handleCallback: async ctx => {
      let baseUrl = ctx.input.baseUrl.replace(/\/+$/, '');
      let http = createAxios({ baseURL: baseUrl });

      let credentials = Buffer.from(`${ctx.clientId}:${ctx.clientSecret}`).toString('base64');

      let response = await http.post(
        '/learn/api/public/v1/oauth2/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`
          }
        }
      );

      let expiresAt = response.data.expires_in
        ? new Date(Date.now() + response.data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: response.data.access_token,
          refreshToken: response.data.refresh_token,
          expiresAt
        },
        input: ctx.input
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw new Error(
          'No refresh token available. Re-authorize with the "offline" scope to enable token refresh.'
        );
      }

      let baseUrl = ctx.input.baseUrl.replace(/\/+$/, '');
      let http = createAxios({ baseURL: baseUrl });

      let credentials = Buffer.from(`${ctx.clientId}:${ctx.clientSecret}`).toString('base64');

      let response = await http.post(
        '/learn/api/public/v1/oauth2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`
          }
        }
      );

      let expiresAt = response.data.expires_in
        ? new Date(Date.now() + response.data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: response.data.access_token,
          refreshToken: response.data.refresh_token ?? ctx.output.refreshToken,
          expiresAt
        },
        input: ctx.input
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: { baseUrl: string };
      scopes: string[];
    }) => {
      let baseUrl = ctx.input.baseUrl.replace(/\/+$/, '');
      let http = createAxios({ baseURL: baseUrl });

      let response = await http.get('/learn/api/public/v1/users/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data;
      return {
        profile: {
          id: user.id,
          email: user.contact?.email,
          name:
            [user.name?.given, user.name?.family].filter(Boolean).join(' ') || user.userName
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Client Credentials',
    key: 'client_credentials',

    inputSchema: z.object({
      baseUrl: z
        .string()
        .describe(
          'The base URL of your Blackboard Learn instance (e.g., https://yourschool.blackboard.com)'
        ),
      applicationKey: z
        .string()
        .describe('Application Key from your registered Blackboard developer application'),
      applicationSecret: z
        .string()
        .describe('Application Secret from your registered Blackboard developer application')
    }),

    getOutput: async ctx => {
      let baseUrl = ctx.input.baseUrl.replace(/\/+$/, '');
      let http = createAxios({ baseURL: baseUrl });

      let credentials = Buffer.from(
        `${ctx.input.applicationKey}:${ctx.input.applicationSecret}`
      ).toString('base64');

      let response = await http.post(
        '/learn/api/public/v1/oauth2/token',
        new URLSearchParams({
          grant_type: 'client_credentials'
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`
          }
        }
      );

      let expiresAt = response.data.expires_in
        ? new Date(Date.now() + response.data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: response.data.access_token,
          expiresAt
        }
      };
    }
  });
