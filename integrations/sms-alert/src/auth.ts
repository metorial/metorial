import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('SMS Alert authentication credential'),
      authType: z.enum(['api_key', 'username_password']).optional(),
      username: z.string().optional(),
      password: z.string().optional()
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
          'API key generated from your SMS Alert dashboard at https://smsalert.co.in/api'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          authType: 'api_key' as const
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Username & Password',
    key: 'username_password',
    inputSchema: z.object({
      username: z.string().describe('SMS Alert account username'),
      password: z.string().describe('SMS Alert account password')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: `${ctx.input.username}:${ctx.input.password}`,
          authType: 'username_password' as const,
          username: ctx.input.username,
          password: ctx.input.password
        }
      };
    }
  });
