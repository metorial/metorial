import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      authMethod: z.enum(['api_key', 'oauth']),
      baseUrl: z.string().optional(),
      tokenEndpoint: z.string().optional(),
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
      oauthToken: z.string().optional(),
      oauthTokenExpiresAt: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Your Nasdaq Data Link API key. Find it on your account settings page at data.nasdaq.com.'
        )
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
    name: 'OAuth2 Client Credentials',
    key: 'oauth_client_credentials',
    inputSchema: z.object({
      clientId: z.string().describe('OAuth2 client ID provided by Nasdaq sales team.'),
      clientSecret: z.string().describe('OAuth2 client secret provided by Nasdaq sales team.'),
      tokenEndpoint: z
        .string()
        .describe('OAuth2 token endpoint URL provided by Nasdaq sales team.'),
      baseUrl: z
        .string()
        .describe('Base URL for the Real-Time/Delayed REST API provided by Nasdaq sales team.')
    }),
    getOutput: async ctx => {
      let http = createAxios();

      let params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', ctx.input.clientId);
      params.append('client_secret', ctx.input.clientSecret);

      let response = await http.post(ctx.input.tokenEndpoint, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      let expiresAt = new Date(Date.now() + response.data.expires_in * 1000).toISOString();

      return {
        output: {
          token: ctx.input.clientId,
          authMethod: 'oauth' as const,
          baseUrl: ctx.input.baseUrl,
          tokenEndpoint: ctx.input.tokenEndpoint,
          clientId: ctx.input.clientId,
          clientSecret: ctx.input.clientSecret,
          oauthToken: response.data.access_token,
          oauthTokenExpiresAt: expiresAt
        }
      };
    }
  });
