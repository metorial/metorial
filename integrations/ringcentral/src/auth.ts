import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let BASE_URL = 'https://platform.ringcentral.com';

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
        url: 'https://developers.ringcentral.com/guide/authentication/auth-code-flow'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.ringcentral.com/guide/basics/permissions'
      }
    ],

    scopes: [
      {
        title: 'Read Accounts',
        description: 'Read account and extension info',
        scope: 'ReadAccounts'
      },
      {
        title: 'Edit Extensions',
        description: 'Edit extension settings',
        scope: 'EditExtensions'
      },
      { title: 'Read Call Log', description: 'Read call log records', scope: 'ReadCallLog' },
      {
        title: 'Read Messages',
        description: 'Read messages (SMS, fax, voicemail)',
        scope: 'ReadMessages'
      },
      { title: 'SMS', description: 'Send and receive SMS/MMS messages', scope: 'SMS' },
      {
        title: 'Internal Messages',
        description: 'Send internal pager messages',
        scope: 'InternalMessages'
      },
      { title: 'Fax', description: 'Send and receive faxes', scope: 'Fax' },
      { title: 'RingOut', description: 'Place calls via RingOut', scope: 'RingOut' },
      {
        title: 'Team Messaging',
        description: 'Post and manage team messages',
        scope: 'TeamMessaging'
      },
      { title: 'Meetings', description: 'Create and manage meetings', scope: 'Meetings' },
      { title: 'Video', description: 'Manage video meetings', scope: 'Video' },
      {
        title: 'Webhook Subscriptions',
        description: 'Manage webhook subscriptions',
        scope: 'WebhookSubscriptions'
      },
      { title: 'Call Control', description: 'Control active calls', scope: 'CallControl' },
      {
        title: 'AI',
        description: 'Access AI features (transcription, summaries)',
        scope: 'AI'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let scopeString = ctx.scopes.join(' ');
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: scopeString
      });

      return {
        url: `${BASE_URL}/restapi/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let httpClient = createAxios({ baseURL: BASE_URL });
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response = await httpClient.post(
        '/restapi/oauth/token',
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
        throw new Error('No refresh token available');
      }

      let httpClient = createAxios({ baseURL: BASE_URL });
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response = await httpClient.post(
        '/restapi/oauth/token',
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

    getProfile: async (ctx: any) => {
      let httpClient = createAxios({ baseURL: BASE_URL });

      let response = await httpClient.get('/restapi/v1.0/account/~/extension/~', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let data = response.data;

      return {
        profile: {
          id: String(data.id),
          name: data.name,
          email: data.contact?.email,
          extensionNumber: data.extensionNumber
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'JWT Credential',
    key: 'jwt',

    inputSchema: z.object({
      jwtToken: z
        .string()
        .describe('JWT credential generated in the RingCentral Developer Console'),
      clientId: z.string().describe('Application Client ID'),
      clientSecret: z.string().describe('Application Client Secret')
    }),

    getOutput: async ctx => {
      let httpClient = createAxios({ baseURL: BASE_URL });
      let credentials = btoa(`${ctx.input.clientId}:${ctx.input.clientSecret}`);

      let response = await httpClient.post(
        '/restapi/oauth/token',
        new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: ctx.input.jwtToken
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

    getProfile: async (ctx: any) => {
      let httpClient = createAxios({ baseURL: BASE_URL });

      let response = await httpClient.get('/restapi/v1.0/account/~/extension/~', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let data = response.data;

      return {
        profile: {
          id: String(data.id),
          name: data.name,
          email: data.contact?.email,
          extensionNumber: data.extensionNumber
        }
      };
    }
  });
