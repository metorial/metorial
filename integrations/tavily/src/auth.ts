import { SlateAuth } from 'slates';
import { credential, z } from './lib/contracts';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Tavily API key. Requests may consume credits; use an appropriate key budget.'
        )
    }),
    getOutput: async ctx => {
      credential(ctx.input.token);
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
