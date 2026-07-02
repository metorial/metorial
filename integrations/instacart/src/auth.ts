import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z
        .string()
        .describe(
          'Bearer token for API requests (API key for IDP, OAuth access token for Connect)'
        ),
      authMethod: z
        .enum(['api_key', 'oauth_client_credentials'])
        .describe('Which auth method was used')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key (Developer Platform)',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z.string().describe('API key from the Instacart Developer Dashboard')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          authMethod: 'api_key' as const
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'OAuth 2.0 Client Credentials (Connect)',
    key: 'oauth_client_credentials',

    inputSchema: z.object({
      clientId: z.string().describe('OAuth client ID provided by Instacart'),
      clientSecret: z.string().describe('OAuth client secret provided by Instacart'),
      scopes: z
        .string()
        .describe('Comma-separated scopes, e.g. "connect:fulfillment,connect:post_checkout"')
    }),

    getOutput: async ctx => {
      let axios = createAxios({
        baseURL: 'https://connect.instacart.com'
      });

      let response = await axios.post('/v2/oauth/token', {
        client_id: ctx.input.clientId,
        client_secret: ctx.input.clientSecret,
        grant_type: 'client_credentials',
        scope: ctx.input.scopes
      });

      return {
        output: {
          token: response.data.access_token,
          authMethod: 'oauth_client_credentials' as const
        }
      };
    }
  });
