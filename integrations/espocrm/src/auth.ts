import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('API key or encoded credentials used for authentication'),
      secretKey: z.string().optional().describe('Secret key for HMAC authentication'),
      authMethod: z
        .enum(['api_key', 'hmac', 'basic'])
        .describe('The authentication method being used')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('API Key from the EspoCRM API User detail view (Administration > API Users)')
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
    name: 'HMAC Authentication',
    key: 'hmac',
    inputSchema: z.object({
      apiKey: z.string().describe('API Key from the EspoCRM HMAC API User'),
      secretKey: z.string().describe('Secret Key from the EspoCRM HMAC API User')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          secretKey: ctx.input.secretKey,
          authMethod: 'hmac' as const
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Basic Authentication',
    key: 'basic',
    inputSchema: z.object({
      username: z.string().describe('EspoCRM username'),
      password: z.string().describe('EspoCRM password or authentication token')
    }),
    getOutput: async ctx => {
      let encoded = Buffer.from(`${ctx.input.username}:${ctx.input.password}`).toString(
        'base64'
      );
      return {
        output: {
          token: encoded,
          authMethod: 'basic' as const
        }
      };
    }
  });
