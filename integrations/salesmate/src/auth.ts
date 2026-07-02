import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      linkname: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe('Your Salesmate API access token. Found under My Account > Access Key.'),
      linkname: z
        .string()
        .describe(
          'Your Salesmate instance hostname (e.g., "demo" if your dashboard URL is demo.salesmate.io)'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          linkname: ctx.input.linkname
        }
      };
    }
  });
