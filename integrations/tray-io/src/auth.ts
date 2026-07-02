import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Tray.io API bearer token (master token or user token)'),
      tokenType: z
        .enum(['master', 'user'])
        .describe('Type of token: master for admin operations, user for end-user operations')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Master Token',
    key: 'master_token',
    inputSchema: z.object({
      masterToken: z
        .string()
        .describe(
          'Master API token obtained from the Tray.io Partner Dashboard under Settings > Tokens'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.masterToken,
          tokenType: 'master' as const
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'User Token',
    key: 'user_token',
    inputSchema: z.object({
      userToken: z
        .string()
        .describe('User access token obtained via the authorize mutation using a master token')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.userToken,
          tokenType: 'user' as const
        }
      };
    }
  });
