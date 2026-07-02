import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      instanceUrl: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z.string().describe('API token generated from your Docnify account'),
      instanceUrl: z
        .string()
        .describe('Your Docnify instance URL (e.g., https://your-instance.docnify.com)')
    }),
    getOutput: async ctx => {
      let instanceUrl = ctx.input.instanceUrl.replace(/\/+$/, '');
      return {
        output: {
          token: ctx.input.token,
          instanceUrl
        }
      };
    }
  });
