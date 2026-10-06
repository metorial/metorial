import { SlateAuth } from 'slates';
import { z } from 'zod';
import { regionSchema, resolveRegion, token } from './lib/validation';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Tray.io API bearer token (master token or user token)'),
      region: regionSchema
        .optional()
        .describe(
          'Account region bound to this credential; older connections use the saved region setting.'
        ),
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
      region: regionSchema
        .optional()
        .describe(
          'Region in which this Tray account and master token were issued. Omitted values use the saved regional setting, or US for new connections.'
        ),
      masterToken: z
        .string()
        .describe(
          'Master API token obtained from the Tray.io Partner Dashboard under Settings > Tokens'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: token(ctx.input.masterToken),
          region: resolveRegion(ctx.input.region, ctx.config?.region),
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
      region: regionSchema
        .optional()
        .describe(
          'Region in which this user token was issued. Omitted values use the saved regional setting, or US for new connections. User tokens expire after two days; reconnect with a newly authorized token.'
        ),
      userToken: z
        .string()
        .describe('User access token obtained via the authorize mutation using a master token')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: token(ctx.input.userToken),
          region: resolveRegion(ctx.input.region, ctx.config?.region),
          tokenType: 'user' as const
        }
      };
    }
  });
