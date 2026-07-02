import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      authMethod: z.enum(['apiKey', 'bearer']).describe('Authentication method being used')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z.string().describe('Your HERE platform API key')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          authMethod: 'apiKey' as const
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'OAuth 2.0 Bearer Token',
    key: 'oauth_bearer',
    inputSchema: z.object({
      bearerToken: z
        .string()
        .describe('OAuth 2.0 Bearer access token obtained from the HERE Authentication API')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.bearerToken,
          authMethod: 'bearer' as const
        }
      };
    }
  });
