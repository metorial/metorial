import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      apiKeyId: z.string().optional(),
      apiKeySecret: z.string().optional(),
      runscopeToken: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key (Basic Auth)',
    key: 'api_key',

    inputSchema: z.object({
      apiKeyId: z.string().describe('BlazeMeter API Key ID'),
      apiKeySecret: z.string().describe('BlazeMeter API Key Secret')
    }),

    getOutput: async ctx => {
      let token = Buffer.from(`${ctx.input.apiKeyId}:${ctx.input.apiKeySecret}`).toString(
        'base64'
      );
      return {
        output: {
          token,
          apiKeyId: ctx.input.apiKeyId,
          apiKeySecret: ctx.input.apiKeySecret
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string };
      input: { apiKeyId: string; apiKeySecret: string };
    }) => {
      let client = createAxios({
        baseURL: 'https://a.blazemeter.com/api/v4',
        headers: {
          Authorization: `Basic ${ctx.output.token}`
        }
      });

      let response = await client.get('/user');
      let data = response.data as {
        result?: {
          id?: number;
          email?: string;
          displayName?: string;
        };
      };

      return {
        profile: {
          id: data.result?.id?.toString(),
          email: data.result?.email,
          name: data.result?.displayName
        }
      };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'API Monitoring (OAuth)',
    key: 'runscope_oauth',

    scopes: [
      {
        title: 'Read Access',
        description:
          'Read access to account information including message streams and buckets',
        scope: 'api:read'
      },
      {
        title: 'Write Messages',
        description: 'Write access to messages',
        scope: 'message:write'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state
      });

      return {
        url: `https://www.runscope.com/signin/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let client = createAxios({ baseURL: 'https://www.runscope.com' });

      let response = await client.post('/signin/oauth/access_token', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        grant_type: 'authorization_code',
        redirect_uri: ctx.redirectUri
      });

      let data = response.data as {
        access_token?: string;
        token_type?: string;
        error?: string;
      };

      if (!data.access_token) {
        throw new Error(`Runscope OAuth error: ${data.error || 'Unknown error'}`);
      }

      return {
        output: {
          token: data.access_token,
          runscopeToken: data.access_token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      let client = createAxios({ baseURL: 'https://api.runscope.com' });

      let response = await client.get('/account', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let data = response.data as {
        data?: {
          id?: string;
          name?: string;
          email?: string;
        };
      };

      return {
        profile: {
          id: data.data?.id,
          name: data.data?.name,
          email: data.data?.email
        }
      };
    }
  });
