import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('GoSquared API key'),
      siteToken: z
        .string()
        .describe(
          'GoSquared project token (for example GSN-123456-A), from the current project settings'
        )
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('GoSquared API key. Generated from Settings > Your Account > API Access.'),
      siteToken: z
        .string()
        .describe(
          'GoSquared project token (for example GSN-123456-A), from the current project settings'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          siteToken: ctx.input.siteToken
        }
      };
    }
  });
