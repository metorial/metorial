import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      instanceUrl: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'OAuth 2.0 Client Credentials',
    key: 'oauth_client_credentials',

    inputSchema: z.object({
      instanceUrl: z
        .string()
        .describe('Your Coupa instance URL, e.g. https://mycompany.coupahost.com'),
      clientId: z.string().describe('OAuth2 Client Identifier from Coupa'),
      clientSecret: z.string().describe('OAuth2 Client Secret from Coupa'),
      scopes: z
        .string()
        .describe(
          'Space-separated list of scopes, e.g. "core.accounting.read core.purchase_order.read"'
        )
    }),

    getOutput: async ctx => {
      let baseUrl = ctx.input.instanceUrl.replace(/\/+$/, '');

      let ax = createAxios({
        baseURL: baseUrl
      });

      let params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', ctx.input.clientId);
      params.append('client_secret', ctx.input.clientSecret);
      params.append('scope', ctx.input.scopes);

      let response = await ax.post('/oauth2/token', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return {
        output: {
          token: response.data.access_token,
          instanceUrl: baseUrl
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',

    name: 'API Key (Deprecated)',
    key: 'api_key',

    inputSchema: z.object({
      instanceUrl: z
        .string()
        .describe('Your Coupa instance URL, e.g. https://mycompany.coupahost.com'),
      apiKey: z.string().describe('40-character Coupa API key')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          instanceUrl: ctx.input.instanceUrl.replace(/\/+$/, '')
        }
      };
    }
  });
