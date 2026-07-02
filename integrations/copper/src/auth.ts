import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let authAxios = createAxios({
  baseURL: 'https://app.copper.com'
});

let apiAxios = createAxios({
  baseURL: 'https://api.copper.com/developer_api/v1'
});

let outputSchema = z.object({
  token: z.string(),
  userEmail: z.string().optional(),
  authMethod: z.enum(['api_key', 'oauth'])
});

type AuthOutput = z.infer<typeof outputSchema>;

export let auth = SlateAuth.create()
  .output(outputSchema)
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z.string().describe('Your Copper API key (found in Settings > API Credentials)'),
      userEmail: z.string().describe('The email address of the user who generated the API key')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          userEmail: ctx.input.userEmail,
          authMethod: 'api_key' as const
        }
      };
    },

    getProfile: async (ctx: {
      output: AuthOutput;
      input: { token: string; userEmail: string };
    }) => {
      let response = await apiAxios.get('/account', {
        headers: {
          'X-PW-AccessToken': ctx.output.token,
          'X-PW-UserEmail': ctx.output.userEmail || '',
          'X-PW-Application': 'developer_api',
          'Content-Type': 'application/json'
        }
      });

      return {
        profile: {
          id: String(response.data.id),
          name: response.data.name,
          email: ctx.output.userEmail
        }
      };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developer.copper.com/introduction/oauth/index.html'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developer.copper.com/introduction/oauth/flow.html'
      }
    ],

    scopes: [
      {
        title: 'Full Access',
        description: 'Full read and write access to all Copper resources',
        scope: 'developer/v1/all'
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

      return {
        url: `https://app.copper.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await authAxios.post(
        '/oauth/token',
        {
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri,
          grant_type: 'authorization_code'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        output: {
          token: response.data.access_token,
          userEmail: undefined,
          authMethod: 'oauth' as const
        }
      };
    },

    getProfile: async (ctx: { output: AuthOutput; input: {}; scopes: string[] }) => {
      let response = await apiAxios.get('/account', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        profile: {
          id: String(response.data.id),
          name: response.data.name
        }
      };
    }
  });
