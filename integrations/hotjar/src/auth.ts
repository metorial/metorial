import { SlateAuth } from 'slates';
import { z } from 'zod';
import { requestHotjarAccessToken } from './lib/oauth';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      clientId: z.string(),
      clientSecret: z.string(),
      expiresAt: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Credentials',
    key: 'api_credentials',

    inputSchema: z.object({
      clientId: z.string().describe('Client ID from Hotjar API credentials (Settings > API)'),
      clientSecret: z
        .string()
        .describe('Client Secret from Hotjar API credentials (Settings > API)')
    }),

    getOutput: async ctx => {
      let token = await requestHotjarAccessToken(ctx.input.clientId, ctx.input.clientSecret);

      return {
        output: {
          token: token.accessToken,
          clientId: ctx.input.clientId,
          clientSecret: ctx.input.clientSecret,
          expiresAt: token.expiresAt
        }
      };
    }
  });
