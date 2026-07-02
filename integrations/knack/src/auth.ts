import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      authMode: z
        .enum(['api_key', 'view_based'])
        .describe('Which authentication mode is in use')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Your Knack REST API Key, found in Builder settings under API & Code')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          authMode: 'api_key' as const
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'User Token (View-Based)',
    key: 'view_based',
    inputSchema: z.object({
      userToken: z
        .string()
        .describe('A user token obtained via remote login, used for view-based API requests')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.userToken,
          authMode: 'view_based' as const
        }
      };
    }
  });
